/** Present guest contacts in the same shape as existing client contacts. */
export function withAppointmentContact<T extends {
  client: { name: string; email: string } | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
}>(appointment: T) {
  return {
    ...appointment,
    client: appointment.client ?? {
      id: null, name: appointment.guestName ?? '',
      email: appointment.guestEmail ?? '', phone: appointment.guestPhone ?? null,
    },
  };
}
