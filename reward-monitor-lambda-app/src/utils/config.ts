// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

export interface ENV {
    TABLE_NAME: string | undefined;
    ALCHEMY_API_KEY: string | undefined;
    ETHERSCAN_API: string | undefined;
    PAGERDUTY_ROUTING_KEY: string | undefined;
    NODE_ENV: string | undefined;
}

export interface Config {
    TABLE_NAME: string;
    ALCHEMY_API_KEY: string;
    ETHERSCAN_API: string;
    PAGERDUTY_ROUTING_KEY: string;
    NODE_ENV: string;
}

// Loading process.env as ENV interface

export const getConfig = (): ENV => {
    return {
        TABLE_NAME: process.env.TABLE_NAME,
        ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
        ETHERSCAN_API: process.env.ETHERSCAN_API,
        PAGERDUTY_ROUTING_KEY: process.env.PAGERDUTY_ROUTING_KEY,
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
