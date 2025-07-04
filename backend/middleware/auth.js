import { clerkClient } from "@clerk/express"

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = req.auth();

        const user = await clerkClient.users.getUser(userId);

        if (user.privateMetadata.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'not authorized' })
        }
        // If the user is an admin, proceed to the next middleware or route handler
       
        next();
    } catch (error) {
        return res.status(500).json({ sucess: false, message: "not authorized" })
    }
}