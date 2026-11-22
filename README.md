# Flight Booking System API

RESTful backend built with **Node.js, Express.js, MongoDB, and Mongoose**, using ES modules and an MVC-style structure.

## ENV

PORT=5000
NODE_ENV=development
MONGO_URI=YOUR_MONGODB_URL
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:3000
COOKIE_NAME=flight_token
ADMIN_EMAIL=YOUR_ADMIN_EMAIL

## Features

- User registration, login, logout, and profile management.
- JWT authentication and `user` / `admin` role authorization.
- Admin flight CRUD; public flight search, filters, pagination, and sorting.
- Multi-passenger bookings, automatic seat-count updates, booking history.
- Cancellation requests with admin approval/rejection.
- Profile and flight image uploads.

## Tech Stack

Node.js · Express.js · MongoDB Atlas · Mongoose · JWT · bcryptjs · Multer · Helmet · Morgan · express-validator

## Project Structure

```text
config/       Database connection
controllers/  Auth, user, flight, and booking logic
middleware/   Auth, uploads, validation, and errors
models/       User, Flight, and Booking schemas
routes/       API routes
scripts/      Admin promotion script
utils/        Shared utilities
validators/   Request validators
uploads/      Uploaded images
app.js        Express configuration
server.js     Application entry point
```

## Setup

**Prerequisites:** Node.js, npm, and MongoDB Atlas (or another MongoDB replica set supporting transactions). 1. Clone and enter the project: `bash     git clone <YOUR_GITHUB_REPOSITORY_URL>     cd flight-booking-system` 2. Install packages: `bash     npm install` 3. Create `.env` in the project root: `dotenv     PORT=     NODE_ENV=     MONGO_URI=     JWT_SECRET=     JWT_EXPIRES_IN=     CLIENT_URL=     COOKIE_NAME=     ADMIN_EMAIL=` Variable Purpose ------------------ ------------------------------------------- `PORT` Server port (default `5000`) `NODE_ENV` `development` or `production` `MONGO_URI` MongoDB connection string and database `JWT_SECRET` Private JWT signing secret `JWT_EXPIRES_IN` JWT expiration duration `CLIENT_URL` Allowed CORS origin `COOKIE_NAME` Auth cookie name (default `flight_token`) `ADMIN_EMAIL` Registered account to promote to admin Never commit `.env` or expose its values. Keep it in `.gitignore`. 4. Start the development server: `bash     npm run dev` Or run `npm start`. Default URL: `http://localhost:5000`. 5. Check the server: `GET http://localhost:5000/api/health`.

## Create an Admin

1.  Register an account using `POST /api/auth/register`.
2.  Set `ADMIN_EMAIL` to that account's email in `.env`.
3.  Run `npm run make-admin`.
4.  Log in again. Public registration cannot set the `role`.

## Authentication

Protected routes accept the HTTP-only login cookie or:

```http
Authorization: Bearer <JWT>
```

- **User:** own profile, flight search, bookings, own booking history, cancellation requests.
- **Admin:** user permissions plus flight management, all bookings, cancellation review.

## API Reference

se URL: `http://localhost:5000/api`

---

Method Endpoint Access Purpose

GET `/health` Public Health check POST `/auth/register` Public Register POST `/auth/login` Public Login POST `/auth/logout` Authenticated Clear auth cookie GET `/users` Authenticated Get own profile PUT `/users/profile` Authenticated Update profile GET `/flights` Public Search/list flights GET `/flights/:id` Public Flight details POST `/flights` Admin Create flight PUT `/flights/:id` Admin Update flight DELETE `/flights/:id` Admin Delete flight POST `/bookings` Authenticated Create booking GET `/bookings` Authenticated Booking history GET `/bookings/:id` Owner/Admin Booking details POST `/bookings/:id/cancellation-request` Owner Request cancellation PATCH `/bookings/:id/cancellation` Admin Approve/reject cancellation --------------------------------------------------------------------------------------------------------

### Register --- `POST /auth/register`

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "StrongPassword123",
  "gender": "other"
}
```

### Login --- `POST /auth/login`

```json
{ "email": "alex@example.com", "password": "StrongPassword123" }
```

### Create Flight --- `POST /flights` (Admin)

Send JSON, or `multipart/form-data` with image field `image`.

```json
{
  "flightNumber": "AB123",
  "airline": "Example Airways",
  "departureCity": "Bengaluru",
  "arrivalCity": "Mumbai",
  "departureDate": "2027-02-15T08:30:00.000Z",
  "arrivalDate": "2027-02-15T10:20:00.000Z",
  "price": 4500,
  "totalSeats": 180,
  "flightClass": "Economy"
}
```

`flightClass`: `Economy`, `Business`, or `First`. Use ISO 8601 dates; arrival must be after departure.

### Search Flights --- `GET /flights`

Optional query parameters (can be combined): - `departureCity`, `arrivalCity` - `departureDate`, `departureDateFrom`, `departureDateTo` - `flightClass`, `airline`, `status` - `priceMin`, `priceMax` - `page`, `limit`, `sortBy`, `sortOrder` Example:

```http
GET /api/flights?departureCity=Bengaluru&arrivalCity=Mumbai&flightClass=Economy&page=1&limit=10
```

`sortBy`: `departureDate`, `price`, `createdAt`, `airline`, or `flightNumber`. `sortOrder`: `asc` or `desc`.

### Update Profile --- `PUT /users/profile`

Authenticated. Send `multipart/form-data` to upload `profilePicture` (maximum 2 MB). Text fields: `name`, `email`, `password`, `gender`.

### Create Booking --- `POST /bookings`

Authenticated. Flight must be scheduled, depart in the future, and have enough seats. Send 1--9 passengers; total price is calculated by the server.

```json
{
  "flightId": "YOUR_FLIGHT_OBJECT_ID",
  "passengers": [
    {
      "name": "Alex Morgan",
      "age": 30,
      "gender": "other",
      "passportNumber": "P1234567"
    },
    { "name": "Taylor Morgan", "age": 28, "gender": "female" }
  ]
}
```

### Cancellation

Booking owner --- `POST /bookings/:id/cancellation-request`:

```json
{ "reason": "Change in travel plans" }
```

Admin --- `PATCH /bookings/:id/cancellation`:

```json
{ "action": "approved" }
```

Use `"rejected"` to reject. Approval cancels the booking and restores its passenger count to available seats.

## Notes

- Booking creation and cancellation approval use MongoDB transactions; use Atlas or a transaction-enabled replica set.
- Passwords are hashed with bcryptjs. Images are stored locally in `uploads/profiles/` and `uploads/flights/`, served under `/uploads`.
- Logout clears the cookie; a separately copied, unexpired Bearer token is not revoked by the current implementation.
- Suggested Postman flow: health check → register/login → promote admin → create flight → search → book → request cancellation → admin review.
