import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod"
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get("/trips/:tripId/confirm", { 
    schema: {
      params: z.object({
        tripId: z.string().uuid(),
      })
    }
   }, async (request, reply) => {
    const { tripId } = request.params

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      },
      include: {
        participants: {
          where: {
            is_owner: false
          }
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    if (trip.is_confirmed) {
      return reply.redirect(`http://localhost:3000/trips/${tripId}`)
    }

    await prisma.trip.update({
      where: {
        id: tripId
      },
      data: {
        is_confirmed: true
      }
    })

    const formattedStartDate = dayjs(trip.starts_at).format("LL")
    const formattedEndDate = dayjs(trip.ends_at).format("LL")

    const mail = await getMailClient();

    await Promise.all(
      trip.participants.map(async (participant) => {
        const confirmationLink = `http://localhost:3333/participants/${participant.id}/confirm`

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
      })
    )

    return reply.redirect(`http://localhost:3000/trips/${tripId}`)
  });
}