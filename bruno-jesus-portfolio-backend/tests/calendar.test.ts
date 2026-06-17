import { describe, expect, it } from "vitest";
import { createCalendarService } from "../src/services/calendar.service";

describe("Calendar Service", () => {
  it("should be defined with correct interface", () => {
    const prismaMock = {};
    const loggerMock = { child: () => ({ error: () => {} }) } as any;
    const service = createCalendarService({ prisma: prismaMock, logger: loggerMock });
    expect(service).toBeDefined();
    expect(service.createEvent).toBeDefined();
    expect(service.listEvents).toBeDefined();
  });
});
