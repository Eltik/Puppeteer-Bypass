// @ts-ignore
const { VM } = require('vm2');
const vm = new VM();
const fs = require('fs');
const { isMainThread, parentPort, workerData } = require('node:worker_threads');
parentPort.on("message", message => {
});
//# sourceMappingURL=hcaptchaWorker.js.map