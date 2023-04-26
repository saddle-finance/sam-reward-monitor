// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

export interface ENV {
    NODE_ENV: string | undefined;
}

export interface Config {
    NODE_ENV: string;
}

// Loading process.env as ENV interface

export const getConfig = (): ENV => {
    return {
        NODE_ENV: process.env.NODE_ENV,
    };
};

// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.

export const getSanitzedConfig = (config: ENV): Config => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined || value === '') {
            throw new Error(`Missing key ${key} in config.env`);
        }
    }
    return config as Config;
};
