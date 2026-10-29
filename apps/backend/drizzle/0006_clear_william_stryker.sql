ALTER TABLE "delivery_events" DROP CONSTRAINT "delivery_events_payload_check";--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_payload_check" CHECK ((
        "delivery_events"."event_type" = 'delivered'
        and "delivery_events"."method" is not null
        and "delivery_events"."reverses_delivery_event_id" is null
        and "delivery_events"."correction_reason" is null
        and "delivery_events"."balance_at_delivery" is not null
        and "delivery_events"."balance_at_delivery" >= 0
        and (
          "delivery_events"."balance_at_delivery" <= 0
          or (
            "delivery_events"."agreement_terms" is not null
            and length(btrim("delivery_events"."agreement_terms")) > 0
          )
        )
      ) or (
        "delivery_events"."event_type" = 'reversed'
        and "delivery_events"."method" is null
        and "delivery_events"."reverses_delivery_event_id" is not null
        and "delivery_events"."correction_reason" is not null
        and length(btrim("delivery_events"."correction_reason")) > 0
      ));