import fastify from "fastify"
import cors from "@fastify/cors"
import { createTrip } from "./routes/create-trip"
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import { confirmTrip } from "./routes/confirm-trip"
import { confirmParticipant } from "./routes/confirm-participant"
import { createActivity } from "./routes/create-activity"
import { getActivities } from "./routes/get-activities"

const app = fastify()

app.register(cors,{
    origin: true
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(createTrip)
app.register(confirmTrip)
app.register(confirmParticipant)
app.register(createActivity)
app.register(getActivities)

app.listen({port:3333},()=>{
    console.log("Server is running on port 3000")
})