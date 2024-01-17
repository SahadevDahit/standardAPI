import jwt from "jsonwebtoken";

const generateToken = (id, type) => {
    return jwt.sign({
        id,
        type
    }, process.env.JWT_KEY, {
        expiresIn: "1d"
    });
};

export default generateToken;