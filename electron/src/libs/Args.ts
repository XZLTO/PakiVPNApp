export function getArgs() {
    const args = process.argv.slice(2);
    const namedArgs: Record<string, any> = {};
    args.forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.replace(/^--/, '').split('=');
            namedArgs[key] = value || true;
        }
    });
    return namedArgs;
}