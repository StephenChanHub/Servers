import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const validatePort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
};

const runPing = async (ip) => {
  try {
    await execFileAsync('ping', ['-c', '1', '-W', '2', ip]);
    return { success: true, message: 'reachable' };
  } catch (error) {
    return {
      success: false,
      message: error?.stderr?.trim() || error?.message || 'ping failed'
    };
  }
};

const checkTcpPort = (ip, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(2500);
    socket.connect(port, ip, () => {
      finish({ port, success: true, message: 'reachable' });
    });

    socket.on('timeout', () => {
      finish({ port, success: false, message: 'connection timeout' });
    });

    socket.on('error', (err) => {
      finish({ port, success: false, message: err.message });
    });
  });
};

const runSshDiagnostics = async (ip, password) => {
  let sshpassAvailable = true;
  try {
    await execFileAsync('sshpass', ['-V']);
  } catch {
    sshpassAvailable = false;
  }

  if (!sshpassAvailable) {
    return {
      success: false,
      message: 'sshpass is not available on server, cannot authenticate with password automatically.'
    };
  }

  const sshBaseArgs = [
    '-p',
    password,
    'ssh',
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'UserKnownHostsFile=/dev/null',
    '-o',
    'ConnectTimeout=6',
    `root@${ip}`
  ];

  try {
    const { stdout } = await execFileAsync('sshpass', [...sshBaseArgs, 'echo connected'], { timeout: 10000 });
    if (!stdout.includes('connected')) {
      return { success: false, message: 'SSH connected but validation output is missing.' };
    }

    const [cpuOut, ramOut, diskOut, uptimeOut] = await Promise.all([
      execFileAsync('sshpass', [...sshBaseArgs, "top -bn1 | awk '/Cpu\(s\)/ {print 100-$8}'"]),
      execFileAsync('sshpass', [...sshBaseArgs, "free | awk '/Mem/ {printf(\"%.0f\", $3/$2*100)}'"]),
      execFileAsync('sshpass', [...sshBaseArgs, "df / | awk 'NR==2 {print $5}' | tr -d '%' "]),
      execFileAsync('sshpass', [...sshBaseArgs, 'uptime -p'])
    ]);

    return {
      success: true,
      message: 'SSH connection successful and metrics collected.',
      metrics: {
        cpu: Number.parseInt(cpuOut.stdout.trim(), 10) || 0,
        ram: Number.parseInt(ramOut.stdout.trim(), 10) || 0,
        disk: Number.parseInt(diskOut.stdout.trim(), 10) || 0,
        uptime: uptimeOut.stdout.trim() || 'N/A'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error?.stderr?.trim() || error?.message || 'SSH connection failed.'
    };
  }
};

export const networkApiMiddleware = async (req, res, next) => {
  if (req.url === '/api/network/validate' && req.method === 'POST') {
    try {
      const { ip, ports = [] } = await parseBody(req);
      if (!ip) {
        sendJson(res, 400, { success: false, message: 'IP is required.' });
        return;
      }

      const invalidPort = ports.find((port) => !validatePort(port));
      if (invalidPort !== undefined) {
        sendJson(res, 400, { success: false, message: `Invalid port: ${invalidPort}` });
        return;
      }

      const ping = await runPing(ip);
      const tcpChecks = await Promise.all(ports.map((port) => checkTcpPort(ip, Number(port))));

      const success = ping.success && tcpChecks.every((item) => item.success);
      const failReasons = [
        !ping.success ? `Ping failed: ${ping.message}` : null,
        ...tcpChecks.filter((item) => !item.success).map((item) => `TCP ${item.port} failed: ${item.message}`)
      ].filter(Boolean);

      sendJson(res, 200, {
        success,
        message: success ? 'Network verification passed.' : failReasons.join('; '),
        ping,
        tcpChecks
      });
      return;
    } catch (error) {
      sendJson(res, 500, { success: false, message: error.message || 'Validation failed.' });
      return;
    }
  }

  if (req.url === '/api/network/ssh-connect' && req.method === 'POST') {
    try {
      const { ip, password } = await parseBody(req);
      if (!ip || !password) {
        sendJson(res, 400, { success: false, message: 'IP and SSH password are required.' });
        return;
      }

      const result = await runSshDiagnostics(ip, password);
      sendJson(res, result.success ? 200 : 400, result);
      return;
    } catch (error) {
      sendJson(res, 500, { success: false, message: error.message || 'SSH connection failed.' });
      return;
    }
  }

  next();
};
