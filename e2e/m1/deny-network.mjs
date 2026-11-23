// Loaded first by `node --import` in every run of check 37: nothing the command does may leave this machine. A connection to any host that is not
// loopback ends the process, after one line (`NETWORK-DENIED <host>`) on stderr that the check looks for. Plain JavaScript, no framework: it must run
// before the command's own code, in the command's own process.
import dns from "node:dns";
import net from "node:net";

const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|::1|\[::1\]|0\.0\.0\.0)$/;
const deny = (host) => {
  process.stderr.write(`NETWORK-DENIED ${host}\n`);
  process.exit(97);
};

const connect = net.Socket.prototype.connect;
/** Where a `connect` call goes, or `undefined` for a path (a local socket). `net.createConnection` hands `connect` one normalized argument: `[options, callback]`, so the options are unwrapped first. */
const target = (args) => {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === "object" && first !== null) return first.path ? undefined : (first.host ?? "localhost");
  return typeof args[1] === "string" ? args[1] : "localhost";
};
net.Socket.prototype.connect = function (...args) {
  const host = target(args);
  if (host !== undefined && !LOCAL.test(String(host))) deny(host);
  return connect.apply(this, args);
};
const lookup = dns.lookup;
dns.lookup = function (host, ...rest) {
  if (!LOCAL.test(String(host))) deny(host);
  return lookup.call(this, host, ...rest);
};
