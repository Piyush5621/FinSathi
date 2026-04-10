-- RLS Policies for Staff, Attendance, and Payroll
-- Staff Policies
CREATE POLICY "Users can manage their own staff" ON public.staff 
FOR ALL USING (auth.uid() = user_id);

-- Attendance Policies
CREATE POLICY "Users can manage their own attendance records" ON public.attendance 
FOR ALL USING (auth.uid() = user_id);

-- Payroll Policies
CREATE POLICY "Users can manage their own payroll records" ON public.payroll 
FOR ALL USING (auth.uid() = user_id);

-- Attendance Scan Policy (Allows staff to mark attendance via the public /attend page)
-- This assumes staff have a qr_token check in the RPC or direct access.
-- For simplicity, let's allow service role or authenticated users to insert.
-- Usually, we use a bypass or a specific function. 
-- But for now, let's ensure the business owner can see everything.
