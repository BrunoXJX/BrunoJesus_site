import type { FastifyInstance } from "fastify";
import { createCalendarController } from "../controllers/calendar.controller";
import type { CalendarService } from "../services/calendar.service";

interface CalendarRouteOptions {
  calendarService: CalendarService;
}

export async function calendarRoutes(app: FastifyInstance, options: CalendarRouteOptions) {
  const controller = createCalendarController({
    calendarService: options.calendarService
  });

  app.post("/calendar/events", controller.createEvent);
  app.get("/calendar/events", controller.listEvents);
}
