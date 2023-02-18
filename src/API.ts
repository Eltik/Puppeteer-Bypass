import { Browser, executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CookieJar, Cookie } from 'tough-cookie';
import axios, { AxiosRequestConfig } from "axios";

export default class API {
    private cookies: CookieJar = new CookieJar();
    private options: Options;
    private browser: Browser = null;

    constructor(options: Options = { headless: true, skip_chromium_download: false }) {
        this.options = options;
    }

    public async get(url: string, options: AxiosRequestConfig = { headers: {} }) {
        const headers = await this.getHeaders(url);
        options.headers["User-Agent"] = headers['User-Agent']
        options.headers["Cookie"] = headers['Cookie']
        const response = await axios(url, options);
        return response;
    }

    public isCloudflareJSChallenge(content: string): Boolean {
        return content.includes('_cf_chl_opt');
    }

    public async getHeaders(url: string) {
        try {
            puppeteer.use(StealthPlugin());
            const options = {
                headless: this.options.headless,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                ignoreHTTPSErrors: true,
                defaultViewport: null,
                ignoreDefaultArgs: ["--disable-extensions"],
                executablePath: executablePath()
            }
            if (this.options.skip_chromium_download) {
                options["executablePath"] = "/usr/bin/chromium-browser";
            }
            this.browser = await puppeteer.launch(options as any);
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
        } finally {
            //await this.browser.close();
            console.log("Finished!");
        }
    }

    public toToughCookie(cookie: Cookie): Cookie {
        const { name, value, expires, domain, path } = cookie;
        const isExpiresValid = expires && typeof expires === 'number';

        const expiresDate = isExpiresValid ? new Date(expires * 1000) : new Date(Date.now() + 9999 * 1000);

        return new Cookie({
            key: name,
            value,
            expires: expiresDate,
            domain: domain.startsWith('.') ? domain.substring(1) : domain,
            path
        });
    }
}

interface Options {
    headless?: boolean;
    skip_chromium_download?: boolean;
}