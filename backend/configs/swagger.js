import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv";
dotenv.config();

const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ShowTime Movie Ticket Booking API",
      version: "1.0.0",
      description: "Comprehensive OpenAPI specification for ShowTime Ticket Booking Backend",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: serverUrl,
        description: "Application Backend Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Bearer Authentication Token Header",
        },
      },
    },
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
