import fastify from "fastify"
import { prisma } from "./lib/prisma"
import { createTrip } from "./routes/create-trip"
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"

const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(createTrip)

app.listen({port:3000},()=>{
    console.log("Server is running on port 3000")
})