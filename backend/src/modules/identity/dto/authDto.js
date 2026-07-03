export class OrganizationDto {
  constructor(org) {
    this.id = org.id;
    this.name = org.name;
    this.businessType = org.business_type;
    this.phone = org.phone;
    this.city = org.city;
    this.state = org.state;
    this.address = org.address;
    this.gstin = org.gstin;
    this.logoUrl = org.logo_url;
    this.isActive = org.is_active;
    this.createdAt = org.created_at;
  }
}

export class UserDto {
  constructor(user) {
    this.id = user.id;
    this.organizationId = user.organization_id;
    this.email = user.email;
    this.name = user.name;
    this.businessName = user.business_name;
    this.businessType = user.business_type;
    this.phone = user.phone;
    this.city = user.city;
    this.state = user.state;
    this.address = user.address;
    this.gstin = user.gstin;
    this.logoUrl = user.logo_url;
    this.isActive = user.is_active;
    this.createdAt = user.created_at;
  }
}

export class StaffDto {
  constructor(staff) {
    this.id = staff.id;
    this.organizationId = staff.organization_id;
    this.userId = staff.user_id;
    this.name = staff.name;
    this.phone = staff.phone;
    this.position = staff.position;
    this.salaryType = staff.salary_type;
    this.baseSalary = staff.base_salary;
    this.joinDate = staff.join_date;
    this.status = staff.status;
    this.qrToken = staff.qr_token;
    this.storeId = staff.store_id;
    this.email = staff.email;
    this.isLoginEnabled = staff.is_login_enabled;
    this.createdAt = staff.created_at;
  }
}

export class SessionDto {
  constructor(session) {
    this.id = session.id;
    this.organizationId = session.organization_id;
    this.userId = session.user_id;
    this.staffId = session.staff_id;
    this.deviceName = session.device_name;
    this.deviceId = session.device_id;
    this.platform = session.platform;
    this.browser = session.browser;
    this.operatingSystem = session.operating_system;
    this.appVersion = session.app_version;
    this.ipAddress = session.ip_address;
    this.lastSeenAt = session.last_seen_at;
    this.createdAt = session.created_at;
    this.revokedAt = session.revoked_at;
  }
}
