import API from "./API";
import vm from "node:vm";
import axios from "axios";

export default class HCaptcha {
    private userAgent:string = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

    constructor() {
    }

    private getMouseMovements(timestamp:number) {
        let lastMovement = timestamp;
        const motionCount = API.randomFromRange(1000, 10000);
        const mouseMovements = [];
        for (let i = 0; i < motionCount; i++) {
            lastMovement += API.randomFromRange(0, 10);
            mouseMovements.push([API.randomFromRange(0, 500), API.randomFromRange(0, 500), lastMovement]);
        }
        return mouseMovements;
    }

    private async hsl(req) {
        const hsl = await axios.get("https://newassets.hcaptcha.com/captcha/v1/a0e2c1c/hcaptcha.js", {
            headers: {
                "User-Agent": this.userAgent,
                Referer: "https://hcaptcha.com/",
            }
        });
        return new Promise((resolve, reject) => {
            const code = `
                var self = {};
                function atob(a) {
                return new Buffer(a, 'base64').toString('binary');
                }
            
                ${hsl}
            
                hsl('${req}').then(resolve).catch(reject)
            `;
            vm.runInNewContext(code, {
                Buffer,
                resolve,
                reject,
            });
        });
    }

    private async tryToSolve(sitekey, host) {
        const headers = {
            "User-Agent": this.userAgent,
        };
        
        let response = await axios(`https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=0`, {
            method: "GET",
            headers,
        });
      
        let timestamp = Date.now() + API.randomFromRange(30, 120);
        response = await axios("https://hcaptcha.com/getcaptcha", {
            method: "POST",
            headers,
            data: {
                sitekey,
                host,
                n: await this.hsl(response.data.c.req),
                c: JSON.stringify(response.data.c),
                motionData: {
                    st: timestamp,
                    dct: timestamp,
                    mm: this.getMouseMovements(timestamp)
                }
            }
        });
      
        if (response.data.generated_pass_UUID) {
          return response.data.generated_pass_UUID;
        }
      
        const key = response.data.key;
        const tasks = response.data.tasklist;
        const job = response.data.request_type;
        timestamp = Date.now() + API.randomFromRange(30, 120);
        const answers = tasks.reduce((accum, t) => ({ ...accum, [t.task_key]: API.randomTrueFalse() }), {});
        const captchaResponse = {
            answers,
            sitekey,
            serverdomain: host,
            job_mode: job,
            motionData: {
                st: timestamp,
                dct: timestamp,
                mm: this.getMouseMovements(timestamp)
            }
        };
      
        response = await axios(`https://hcaptcha.com/checkcaptcha/${key}`, {
            method: "POST",
            headers,
            data: captchaResponse
        });
      
        if (response.data.generated_pass_UUID) {
            return response.data.generated_pass_UUID;
        }
    }

    public async solveCaptcha(url, options = { gentleMode: false, timeoutInMs: 12000000}) {
        const { hostname } = new URL(url);
        const siteKey = API.uuid();
        const startingTime = Date.now();
        
        while (true) {
            try {
                const result = await this.tryToSolve(siteKey, hostname);
                if (result) {
                    return result;
                }
            } catch (e) {
                if (e.statusCode === 429) {
                    // reached rate limit, wait 30 sec
                    await API.wait(30000);
                } else {
                    throw e;
                }
            }
            if (Date.now() - startingTime > options.timeoutInMs) {
                throw new Error('captcha resolution timeout');
            }
            if (options.gentleMode) {
                // wait a bit to avoid rate limit errors
                API.wait(3000);
            }
        }
    }
}