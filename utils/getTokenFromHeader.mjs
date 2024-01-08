export const getTokenFromHeader = (req) => {
    try {
        // get token from header
        const token = req?.headers?.authorization?.split(" ")[1];
        if (token === undefined) {
            throw new Error("No token found in the header");
        } else {
            return token;
        }
    } catch (error) {
        throw {
            code: 0,
            message: error.message,
        };
    }
};