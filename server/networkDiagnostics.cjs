const { execFile } = require('node:child_process');
const net = require('node:net');
const { promisify } = require('node:util');
const dns = require('node:dns').promises;

const execFileAsync = promisify(execFile);

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
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

const isIpv4Like = (text = '') => /^(\d{1,3}\.){3}\d{1,3}$/.test(text);

const resolveTargetHost = async (targetRaw) => {
  const targetInput = String(targetRaw || '').trim();
  if (!targetInput) throw new Error('IP or domain is required.');

  if (isIpv4Like(targetInput)) {
    return { targetInput, resolvedIp: targetInput, resolvedFromDomain: false };
  }

  const records = await dns.lookup(targetInput, { all: true, verbatim: true });
  const ipv4 = records.find((item) => item.family === 4);
  if (!ipv4?.address) {
    throw new Error(`Domain resolve failed: ${targetInput}`);
  }

  return {
    targetInput,
    resolvedIp: ipv4.address,
    resolvedFromDomain: true
  };
};

const classifyNetworkIssue = (message = '') => {
  const text = message.toLowerCase();
  if (
    text.includes('timeout') ||
    text.includes('unreachable') ||
    text.includes('no route') ||
    text.includes('100% packet loss') ||
    text.includes('temporary failure')
  ) {
    return 'degraded';
  }
  return 'down';
};

const resolveOverallStatus = (ping, tcpChecks) => {
  if (!ping.success && ping.status === 'down') return 'offline';
  if (!ping.success && ping.status === 'degraded') return 'warning';

  const hasDown = tcpChecks.some((item) => item.status === 'down');
  const hasDegraded = tcpChecks.some((item) => item.status === 'degraded');

  if (hasDown || hasDegraded) return 'warning';
  return 'online';
};

const runPing = async (ip) => {
  try {
    await execFileAsync('ping', ['-c', '1', '-W', '2', ip]);
    return { success: true, message: 'reachable', status: 'up' };
  } catch (error) {
    const message = error?.stderr?.trim() || error?.message || 'ping failed';
    return {
      success: false,
      message,
      status: classifyNetworkIssue(message)
    };
  }
};

const checkTcpPort = (ip, port) =>
  new Promise((resolve) => {
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
      finish({ port, success: true, message: 'reachable', status: 'up' });
    });

    socket.on('timeout', () => {
      finish({ port, success: false, message: 'connection timeout', status: 'degraded' });
    });

    socket.on('error', (err) => {
      const message = err.message || 'tcp connect failed';
      finish({ port, success: false, message, status: classifyNetworkIssue(message) });
    });
  });

const extractPercentLikeNumber = (text) => {
  const match = String(text || '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
};

const runRemoteCommand = async (sshBaseArgs, command, timeout = 12000) => {
  const { stdout } = await execFileAsync('sshpass', [...sshBaseArgs, command], { timeout });
  return stdout.trim();
};

const runMetricWithFallback = async (sshBaseArgs, commandList, defaultValue = 0) => {
  for (const command of commandList) {
    try {
      const output = await runRemoteCommand(sshBaseArgs, command);
      const parsed = extractPercentLikeNumber(output);
      if (parsed !== null) return parsed;
    } catch {
      // fallback
    }
  }
  return defaultValue;
};

const runSshDiagnostics = async (target, password) => {
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

  const { targetInput, resolvedIp, resolvedFromDomain } = await resolveTargetHost(target);
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
    `root@${resolvedIp}`
  ];

  try {
    const helloOutput = await runRemoteCommand(sshBaseArgs, 'echo connected', 10000);
    if (!helloOutput.includes('connected')) {
      return { success: false, message: 'SSH connected but validation output is missing.' };
    }

    const cpu = await runMetricWithFallback(sshBaseArgs, [
      `LC_ALL=C top -bn1 | awk -F',' '/Cpu\\(s\\)|%Cpu/{for(i=1;i<=NF;i++){if($i ~ /(id|idle)/){gsub(/[^0-9.]/,"",$i); if($i != ""){printf("%.0f",100-$i); exit}}}}'`,
      `LC_ALL=C vmstat 1 2 | tail -1 | awk '{print 100-$15}'`,
      `top -l 1 | awk -F'[:, ]+' '/CPU usage/ {printf("%.0f", $3 + $5)}'`
    ]);

    const ram = await runMetricWithFallback(sshBaseArgs, [`free | awk '/Mem/ {printf("%.0f", $3/$2*100)}'`]);
    const disk = await runMetricWithFallback(sshBaseArgs, [`df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}'`]);

    let uptime = 'N/A';
    try {
      uptime = await runRemoteCommand(sshBaseArgs, 'uptime -p || uptime');
      if (!uptime) uptime = 'N/A';
    } catch {
      uptime = 'N/A';
    }

    return {
      success: true,
      message: 'SSH connection successful and metrics collected.',
      target: resolvedIp,
      targetInput,
      resolvedIp,
      resolvedFromDomain,
      metrics: { cpu, ram, disk, uptime }
    };
  } catch (error) {
    return {
      success: false,
      message: error?.stderr?.trim() || error?.message || 'SSH connection failed.',
      target: resolvedIp,
      targetInput,
      resolvedIp,
      resolvedFromDomain
    };
  }
};

const handleNetworkApiRequest = async (req, res, pathname) => {
  if (pathname === '/backend-api/network/validate' && req.method === 'POST') {
    try {
      const { target, ip, ports = [] } = await parseBody(req);
      const normalizedTarget = String(target || ip || '').trim();
      if (!normalizedTarget) {
        sendJson(res, 400, { success: false, message: 'IP or domain is required.' });
        return true;
      }

      const invalidPort = ports.find((port) => !validatePort(port));
      if (invalidPort !== undefined) {
        sendJson(res, 400, { success: false, message: `Invalid port: ${invalidPort}` });
        return true;
      }

      const resolved = await resolveTargetHost(normalizedTarget);
      const ping = await runPing(resolved.resolvedIp);
      const tcpChecks = await Promise.all(ports.map((port) => checkTcpPort(resolved.resolvedIp, Number(port))));
      const success = ping.success && tcpChecks.every((item) => item.success);
      const overallStatus = resolveOverallStatus(ping, tcpChecks);

      const failReasons = [
        !ping.success ? `Ping failed: ${ping.message}` : null,
        ...tcpChecks.filter((item) => !item.success).map((item) => `TCP ${item.port} failed: ${item.message}`)
      ].filter(Boolean);

      sendJson(res, 200, {
        success,
        overallStatus,
        message: success ? 'Network verification passed.' : failReasons.join('; '),
        targetInput: resolved.targetInput,
        resolvedIp: resolved.resolvedIp,
        resolvedFromDomain: resolved.resolvedFromDomain,
        ping,
        tcpChecks
      });
      return true;
    } catch (error) {
      sendJson(res, 500, { success: false, message: error.message || 'Validation failed.' });
      return true;
    }
  }

  if (pathname === '/backend-api/network/ssh-connect' && req.method === 'POST') {
    try {
      const { target, ip, password } = await parseBody(req);
      const normalizedTarget = String(target || ip || '').trim();
      if (!normalizedTarget || !password) {
        sendJson(res, 400, { success: false, message: 'IP/domain and SSH password are required.' });
        return true;
      }

      const result = await runSshDiagnostics(normalizedTarget, password);
      sendJson(res, result.success ? 200 : 400, result);
      return true;
    } catch (error) {
      sendJson(res, 500, { success: false, message: error.message || 'SSH connection failed.' });
      return true;
    }
  }

  return false;
};

module.exports = {
  handleNetworkApiRequest
};
