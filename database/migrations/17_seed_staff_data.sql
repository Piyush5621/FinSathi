-- Seed Staff Data for Testing
DO $$ 
DECLARE 
    v_user_id UUID;
    v_staff_id UUID;
    v_staff_2_id UUID;
BEGIN
    -- Get a user ID
    SELECT id INTO v_user_id FROM public.users LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- 1. Create Staff Members
        INSERT INTO public.staff (user_id, name, phone, position, salary_type, base_salary, qr_token)
        VALUES (v_user_id, 'Rajesh Kumar', '9898989898', 'Senior Sales Executive', 'fixed', 25000, 'rajesh-402')
        RETURNING id INTO v_staff_id;

        INSERT INTO public.staff (user_id, name, phone, position, salary_type, base_salary, qr_token)
        VALUES (v_user_id, 'Anita Sharma', '9797979797', 'Store Manager', 'fixed', 35000, 'anita-901')
        RETURNING id INTO v_staff_2_id;

        -- 2. Create Attendance for today
        INSERT INTO public.attendance (user_id, staff_id, date, status, clock_in)
        VALUES (v_user_id, v_staff_id, current_date, 'present', now() - interval '2 hours')
        ON CONFLICT (staff_id, date) DO NOTHING;

        INSERT INTO public.attendance (user_id, staff_id, date, status, clock_in)
        VALUES (v_user_id, v_staff_2_id, current_date, 'late', now() - interval '1 hour')
        ON CONFLICT (staff_id, date) DO NOTHING;

        -- 3. Create a Payroll record for previous month
        INSERT INTO public.payroll (user_id, staff_id, month, year, base_pay, bonus, deductions, total_paid, payment_status, payment_date)
        VALUES (v_user_id, v_staff_id, 3, 2026, 25000, 2000, 500, 26500, 'paid', now() - interval '5 days');

    END IF;
END $$;
