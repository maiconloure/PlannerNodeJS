import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod"
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post("/trips", { 
    schema: {
      body: z.object({
        destination: z.string().min(4),
        starts_at: z.coerce.date(),
        ends_at: z.coerce.date(),
        owner_name: z.string(),
        owner_email: z.string().email(),
        emails_to_invite: z.array(z.string().email()),
      })
    }
   }, async (request) => {
    const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body

    if (dayjs(starts_at).isBefore(new Date())) {
      throw new Error("Start date must be in the future")
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
      throw new Error("End date must be after start date")
    }

    const trip = await prisma.trip.create({
      data: {
        destination,
        starts_at,
        ends_at,
        participants: {
          createMany: {
            data: [
              {
                name: owner_name,
                email: owner_email,
                is_owner: true,
                is_confirmed: true
              },
              ...emails_to_invite.map(email => ({
                email,
                is_owner: false,
                is_confirmed: false
              }))
            ]
          }
        }
      }
    })

    const mail = await getMailClient()

    const formattedStartDate = dayjs(starts_at).format("LL")
    const formattedEndDate = dayjs(ends_at).format("LL")

    const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`	

    const message = await mail.sendMail({
      from: {
        name: "Rocketseat",
        address: "test@plann.er"
      },
      to: {
        name: owner_name,
        address: owner_email
      },
      subject: "Your trip has been created!",
      html: `
        <div>
          <p>Hello ${owner_name}, your trip to ${destination} has been created!</p>
          <p></p>
          <p>To confirm your trip, click on the link below:</p>
          <a href="${confirmationLink}">Confirm trip</a>
        </div>
      `.trim()
    })

    console.log(nodemailer.getTestMessageUrl(message))


    return { tripId: trip.id }
  });
}