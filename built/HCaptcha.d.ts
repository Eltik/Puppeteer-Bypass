export default class HCaptcha {
    private userAgent;
    constructor();
    private getMouseMovements;
    private hsl;
    private tryToSolve;
    solveCaptcha(url: any, options?: {
        gentleMode: boolean;
        timeoutInMs: number;
    }): Promise<any>;
}
