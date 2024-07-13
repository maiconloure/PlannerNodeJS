import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod"
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/invites", { 
    schema: {
      params: z.object({
        tripId: z.string().uuid()
      }),
      body: z.object({
        email: z.string().email(),
      })
    }
   }, async (request) => {
    const { tripId } = request.params
    const { email } = request.body

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      }
    })

    if (!trip) {
      throw new ClientError("Trip not found")
    }

    const participant = await prisma.participant.create({
      data: {
        email,
        trip_id: tripId
      }
    })

    const formattedStartDate = dayjs(trip.starts_at).format("LL")
    const formattedEndDate = dayjs(trip.ends_at).format("LL")

    const mail = await getMailClient();

    const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

    const message = await mail.sendMail({
      from: {
        name: "Equipe plann.er",
        address: "trips@plann.er"
      },
      to: participant.email,
      subject: "Your was invited to participate in a trip",
      html: `
        <div>
          <p>Hello ${participant.name}, your trip to ${trip.destination} from ${formattedStartDate} to ${formattedEndDate} has been confirmed!</p>
          <p></p>
      <p>To confirm your trip, click on the link below:</p>
          <a href="${confirmationLink}">See details</a>
        </div>
      `.trim()
    })
    console.log(nodemailer.getTestMessageUrl(message))

    return { participantId: participant.id }
  });
}