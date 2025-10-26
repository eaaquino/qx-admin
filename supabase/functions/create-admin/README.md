# Create Admin Edge Function

This Supabase Edge Function handles the complete admin user creation process, including creating the Supabase Auth user automatically.

## Deployment

```bash
supabase functions deploy create-admin --no-verify-jwt
```

## Usage

The admin panel will automatically call this function when creating a new admin user. No manual intervention needed.

## What it does

1. Verifies the requesting user is an active super_admin
2. Creates a Supabase Auth user with the provided credentials
3. Creates an admin record in the admins table
4. Handles errors gracefully (rolls back auth user if admin creation fails)

## Security

- Only super admins can call this function
- Requires valid JWT authorization header
- Uses service role key server-side (never exposed to client)
- Auto-confirms email (no verification needed for admin users)

## Request Format

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "admin",
  "is_active": true
}
```

## Response Format

Success:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "admin",
    "is_active": true
  },
  "message": "Admin user created successfully"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message here"
}
```
