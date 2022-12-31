export function createStreamApplication(
    options: {
        name: string;
        record?: boolean;
        live: boolean;
        urls: string[];
    }
): string {

    const builtURLs = options.urls.reduce((acc, url) => {
        return acc + `push ${url};\n            `
    }, '')

    return `
        application ${options.name} {
            live ${options.live ? 'on' : 'off'};
            record off;
                
            ${builtURLs}
        }
    `;
}
