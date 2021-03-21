JSON.stringify(Object.fromEntries(
    Object.entries(parts).map(([name, ctor]) => {
        const part = new ctor();
        const obj = {};
        for(const k in part) {
            if(
                typeof part[k] !== 'function' &&
                !['pos', 'worldPos', 'flip', 'rot', 'dir'].includes(k)
            ) {
                obj[k] = part[k];
            }
        }
        return [name, obj];
    })
));
