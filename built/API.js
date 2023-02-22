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
const cheerio_1 = require("cheerio");
class API {
    /**
     * @constructor
     * @description You will NEED to use non-headless mode. It doesn't work otherwise.
     * @param options Whether to use headless mode, skip chromium download, or specify a custom path to chromium
     */
    constructor(options = { headless: false, skip_chromium_download: false, chromium_path: "/usr/bin/chromium-browser" }) {
        this.requests = [];
        this.cookies = new tough_cookie_1.CookieJar();
        this.browser = null;
        this.options = options;
    }
    /**
     * @description Initialize the browser
     */
    async init() {
        puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
        // These can be optimized more. I just put them here for now.
        const options = {
            headless: this.options.headless,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            ignoreDefaultArgs: ["--disable-extensions"],
            executablePath: (0, puppeteer_1.executablePath)(),
            env: {
                DISPLAY: ":10.0",
            }
        };
        if (this.options.skip_chromium_download) {
            options["executablePath"] = this.options.chromium_path;
        }
        // Launches the browser
        this.browser = await puppeteer_extra_1.default.launch(options);
    }
    /**
     * @description Safely closes the browser instance. Not necessary to call this function; just have it for good measure.
     */
    async close() {
        await this.browser.close();
        // Resets the browser variable so that if the object is used again, the browser will be re-initialized
        this.browser = null;
    }
    /**
     * @description First checks if there are any valid cookies for the URL requested. If not, it will request the URL and get the cookies using Puppeteer. If there are valid cookies, it will use those cookies to make the request.
     * @param url Request URL
     * @param options Axios config. Be careful of of using a custom User-Agent/Cookie header, as it will be overwritten.
     * @returns Promise<AxiosResponse>
     */
    async request(url, options = { headers: {} }) {
        // First check if the request is stored in the object
        const possible = this.getRequest(url);
        if (!possible) {
            const check = await (0, axios_1.default)(url, options).catch((err) => {
                // If the request fails, check if it's due to a CloudFlare challenge
                if (this.isCloudflareJSChallenge(err.response.data)) {
                    // If it is, this means that we need to fetch new headers.
                    return null;
                }
            });
            if (!check) {
                // Fetch headers needed to bypass CloudFlare.
                const headers = await this.getHeaders(url);
                this.requests.push({
                    url: url,
                    options: options,
                    cookies: headers.Cookie,
                    userAgent: headers['User-Agent']
                });
                options.headers["User-Agent"] = headers['User-Agent'];
                options.headers["Cookie"] = headers['Cookie'];
                // Send a request with the headers
                const response = await (0, axios_1.default)(url, options);
                return response;
            }
            else {
                // No need to fetch headers, just return the response
                return check;
            }
        }
        else {
            // Set the headers/cookies to the stored request
            options.headers["User-Agent"] = possible.userAgent;
            options.headers["Cookie"] = possible.cookies;
            // Try to send the request
            const response = await (0, axios_1.default)(url, options).catch((err) => {
                const body = err.response.data;
                // Check if the error is due to a CloudFlare challenge
                if (this.isCloudflareJSChallenge(body)) {
                    // If it is, remove the request (it's invalid)
                    this.removeRequest(url);
                    // Try to send the request again with new headers
                    return this.request(url, options);
                }
            });
            return response;
        }
    }
    /**
     * @description Checks if there is a request object for the URL
     * @param url URL to check for
     * @returns Requests object if found, otherwise undefined
     */
    getRequest(url) {
        const request = this.requests.find((request) => request.url == url);
        if (request) {
            return request;
        }
    }
    /**
     * @description Removes a request object from the requests array
     * @param url URL to remove from the requests array
     */
    removeRequest(url) {
        const index = this.requests.findIndex((request) => request.url == url);
        if (index > -1) {
            this.requests.splice(index, 1);
        }
    }
    /**
     * @description Checks if the request is a Cloudflare JS challenge
     * @param content HTML content
     * @returns Boolean
     */
    isCloudflareJSChallenge(content) {
        return content.includes('_cf_chl_opt');
    }
    /**
     * @description Gets the headers for the URL requested to bypass CloudFlare
     * @param url URL to fetch
     * @returns Promise<{ "User-Agent": string, "Cookie": string }>
     */
    async getHeaders(url) {
        // Check if the browser is open or not
        if (!this.browser) {
            // Launch the browser
            await this.init();
        }
        const page = await this.browser.newPage();
        await page.goto(url);
        // Basic timeout
        const timeoutInMs = 16000;
        // Update the HTML content until the CloudFlare challenge loads
        let count = 1;
        let content = '';
        while (content == '' || this.isCloudflareJSChallenge(content)) {
            await page.waitForNetworkIdle({ timeout: timeoutInMs });
            content = await page.content();
            // Sometimes there is a captcha or the browser gets stuck, so an error will be thrown in that case
            if (count++ > 10) {
                throw new Error('stuck');
            }
        }
        // Fetch the browser's cookies (contains cf_clearance and other important cookies to bypass CloudFlare)
        const cookies = await page.cookies();
        for (let cookie of cookies) {
            // Update the cookie jar
            this.cookies.setCookie(this.toToughCookie(cookie), url.toString()).catch((err) => {
                return;
            });
        }
        // You need to fetch the User-Agent since you can't bypass CloudFlare without a valid one
        const userAgent = await page.evaluate(() => navigator.userAgent);
        const cookieList = await this.cookies.getCookies(url);
        // These are the headers required to bypass CloudFlare
        const headers = {
            'User-Agent': userAgent,
            "Cookie": cookieList.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ') // Cookies as a string
        };
        // No need to use that page anymore.
        await page.close();
        return headers;
    }
    /**
     * @description Converts a Puppeteer cookie to a tough-cookie cookie
     * @param cookie Cookie object
     * @returns Cookie
     */
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
    /**
     * @description Solves reCAPTCHA v3. Requires an anchor link that you can find in the network requests.
     * @param key Captcha ID
     * @param anchorLink Captcha anchor link. It's dependent to the site.
     * @param url Main page URL
     * @returns Captcha Token
     */
    async solveCaptcha3(key, anchorLink, url) {
        const uri = new URL(url);
        const domain = uri.protocol + '//' + uri.host;
        const { data } = await this.request(`https://www.google.com/recaptcha/api.js?render=${key}`, {
            headers: {
                Referer: domain,
            },
        });
        const v = data.substring(data.indexOf('/releases/'), data.lastIndexOf('/recaptcha')).split('/releases/')[1];
        // ANCHOR IS SPECIFIC TO SITE
        const curK = anchorLink.split('k=')[1].split('&')[0];
        const curV = anchorLink.split("v=")[1].split("&")[0];
        const anchor = anchorLink.replace(curK, key).replace(curV, v);
        const req = await this.request(anchor);
        const $ = (0, cheerio_1.load)(req.data);
        const reCaptchaToken = $('input[id="recaptcha-token"]').attr('value');
        if (!reCaptchaToken)
            throw new Error('reCaptcha token not found');
        return reCaptchaToken;
    }
    /**
     * @description Solves reCAPTCHA v3 via HTML. Requires an anchor link that you can find in the network requests.
     * @param html HTML to solve the captcha from
     * @param anchorLink Captcha anchor link. It's dependent to the site.
     * @param url Main page URL
     * @returns Captcha Token
     */
    async solveCaptcha3FromHTML(html, anchorLink, url) {
        const $ = (0, cheerio_1.load)(html);
        let captcha = null;
        $("script").map((index, element) => {
            if ($(element).attr("src") != undefined && $(element).attr("src").includes("/recaptcha/")) {
                captcha = $(element).attr("src");
            }
        });
        if (!captcha) {
            throw new Error("Couldn't fetch captcha.");
        }
        const captchaURI = new URL(captcha);
        const captchaId = captchaURI.searchParams.get("render");
        const captchaKey = await this.solveCaptcha3(captchaId, anchorLink, url);
        return captchaKey;
    }
    // Not working
    async solveTurnstile(url) {
        /*
        const { data } = await this.request(url);
        const $ = load(data);
        console.log($("div.cf-turnstile").attr("data-sitekey"));
        const turnstile = $("div.cf-turnstile").attr("date-sitekey");
        if (!turnstile) {
            throw new Error("Couldn't fetch turnstile.");
        }
        */
        const turnstile = "1x00000000000000000000AA";
        // Todo
        const req = await axios_1.default.post(`https://api.cloudflareclient.com/v0a${turnstile}/reg`, {
            "key": `${turnstile}`,
            "install_id": "00000000-0000-0000-0000-000000000000",
            "fcm_token": `${turnstile}:APA91b${turnstile}`,
            "referrer": "https://www.cloudflare.com",
            "warp_enabled": false,
            "tos": new Date().toISOString().slice(0, 10),
            "type": "Android",
            "locale": "en-US"
        });
        return null;
    }
    /**
     * UTILS
     */
    /**
     * @description Randomizes a number from a range
     * @param start Max
     * @param end Min
     * @returns number
     */
    static randomFromRange(start, end) {
        return Math.round(Math.random() * (end - start) + start);
    }
    /**
     * @description Random true/false as a string
     * @returns Random true or false as a string
     */
    static randomTrueFalse() {
        return API.randomFromRange(0, 1) ? 'true' : 'false';
    }
    /**
     * @description Waits for a specified amount of time
     * @param time Time in ms
     * @returns void
     */
    static async wait(time) {
        return new Promise(resolve => {
            setTimeout(resolve, time);
        });
    }
    static uuid(a) {
        return a ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, API.uuid);
    }
}
exports.default = API;
//# sourceMappingURL=API.js.map