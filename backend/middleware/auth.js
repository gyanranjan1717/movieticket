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

// This middleware checks if the user is authenticated and has the admin role.
// If the user is not authenticated or does not have the admin role, it returns a 401 Unauthorized response.
// If the user is authenticated and has the admin role, it calls the next middleware or route handler to proceed with the request.