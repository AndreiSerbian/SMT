ALTER TABLE public.checkout_requests ADD COLUMN notifications_completed boolean NOT NULL DEFAULT false, ADD COLUMN notification_lease_until timestamptz;
CREATE OR REPLACE FUNCTION public.create_checkout_order(p_request_id uuid, p_request_hash text, p_order jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.checkout_requests; new_id uuid := gen_random_uuid(); result public.orders;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing FROM public.checkout_requests WHERE request_id=p_request_id;
  IF FOUND THEN
    IF existing.request_hash <> p_request_hash THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    SELECT * INTO result FROM public.orders WHERE id=existing.order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_PROCESSING'; END IF;
    RETURN jsonb_build_object('order',to_jsonb(result),'replay',true);
  END IF;
  INSERT INTO public.orders(id,name,phone,email,yandex_address,comment,payment,delivery,cart_items,subtotal,discount,total,order_status,subscribe,client_id)
  VALUES(new_id,p_order->>'name',p_order->>'phone',p_order->>'email',p_order->>'yandex_address',p_order->>'comment',p_order->>'payment',p_order->>'delivery',p_order->'cart_items',(p_order->>'subtotal')::numeric,(p_order->>'discount')::numeric,(p_order->>'total')::numeric,'created',coalesce((p_order->>'subscribe')::boolean,true),nullif(p_order->>'client_id','')::uuid) RETURNING * INTO result;
  INSERT INTO public.checkout_requests(request_id,request_hash,order_id) VALUES(p_request_id,p_request_hash,new_id);
  RETURN jsonb_build_object('order',to_jsonb(result),'replay',false);
END $$;
REVOKE ALL ON FUNCTION public.create_checkout_order(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_checkout_notifications(p_request_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.checkout_requests SET notification_lease_until=now()+interval '2 minutes' WHERE request_id=p_request_id AND notifications_completed=false AND (notification_lease_until IS NULL OR notification_lease_until<now());
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_checkout_notifications(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_notifications(uuid) TO service_role;