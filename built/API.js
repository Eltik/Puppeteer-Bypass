"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("puppeteer");
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const tough_cookie_1 = require("tough-cookie");
const axios_1 = __importDefault(require("axios"));
class API {
    constructor(options = { headless: true, skip_chromium_download: false }) {
        this.cookies = new tough_cookie_1.CookieJar();
        this.browser = null;
        this.options = options;
    }
    async get(url, options = { headers: {} }) {
        const headers = await this.getHeaders(url);
        options.headers["User-Agent"] = headers['User-Agent'];
        options.headers["Cookie"] = headers['Cookie'];
        const response = await (0, axios_1.default)(url, options);
        return response;
    }
    isCloudflareJSChallenge(content) {
        return content.includes('_cf_chl_opt');
    }
    async getHeaders(url) {
        try {
            puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
            const options = {
                headless: this.options.headless,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                ignoreHTTPSErrors: true,
                defaultViewport: null,
                ignoreDefaultArgs: ["--disable-extensions"],
                executablePath: (0, puppeteer_1.executablePath)()
            };
            if (this.options.skip_chromium_download) {
                options["executablePath"] = "/usr/bin/chromium-browser";
            }
            this.browser = await puppeteer_extra_1.default.launch(options);
            const page = await this.browser.newPage();
            await page.goto(url);
            const timeoutInMs = 16000;
            let count = 1;
            let content = '';
            while (content == '' || this.isCloudflareJSChallenge(content)) {
                await page.waitForNetworkIdle({ timeout: timeoutInMs });
                content = await page.content();
                if (count++ > 10) {
                    throw new Error('stuck');
                }
            }
            const cookies = await page.cookies();
            for (let cookie of cookies) {
                this.cookies.setCookie(this.toToughCookie(cookie), url.toString()).catch((err) => {
                    return;
                });
            }
            const userAgent = await page.evaluate(() => navigator.userAgent);
            const cookieList = await this.cookies.getCookies(url);
            const headers = {
                'User-Agent': userAgent,
                "Cookie": cookieList.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ')
            };
            return headers;
        }
        finally {
            //await this.browser.close();
            console.log("Finished!");
        }
    }
    toToughCookie(cookie) {
        const { name, value, expires, domain, path } = cookie;
        const isExpiresValid = expires && typeof expires === 'number';
        const expiresDate = isExpiresValid ? new Date(expires * 1000) : new Date(Date.now() + 9999 * 1000);
        return new tough_cookie_1.Cookie({
            key: name,
            value,
            expires: expiresDate,
            domain: domain.startsWith('.') ? domain.substring(1) : domain,
            path
        });
    }
}
exports.default = API;
//# sourceMappingURL=API.js.map