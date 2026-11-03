# Authentication API ডকুমেন্টেশন (Auth Flow, Payload & Response)

Nest Commerce প্রজেক্টের **Authentication ও Identity Bounded Context**-এর সম্পূর্ণ API ফ্লো, রিকোয়েস্ট পেলোড, রেসপন্স ফরম্যাট এবং কর্নার কেসসমূহ বাংলায় নিচে বিস্তারিত দেওয়া হলো।

---

## ১. ওভারভিউ ও সিকিউরিটি আর্কিটেকচার

- **টোকেন টাইপ:** JSON Web Token (JWT)
- **পাসওয়ার্ড হ্যাশিং:** `bcrypt` (১০ সল্ট রাউন্ড সহ)
- **গ্লোবাল API প্রিফিক্স:** `/api/v1`
- **টোকেন পেয়ার লাইফসাইকেল:**
  - `accessToken`: স্বল্পমেয়াদী (১৫ মিনিট) – প্রতিটি সিকিউর API রিকোয়েস্টে ব্যবহারের জন্য।
  - `refreshToken`: দীর্ঘমেয়াদী (৭ দিন) – সেশন চালু রাখতে এবং অ্যাক্সেস টোকেন রিনিউ করতে। এটি ডাটাবেজে হ্যাশ আকারে সংরক্ষিত থাকে।
- **টোকেন পেলোড:**
  ```json
  {
    "sub": "user-uuid-1234",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "iat": 1730635200,
    "exp": 1730636100
  }
  ```

---

## ২. ইউজার রেজিস্ট্রেশন (Register Flow)

নতুন কাস্টমার অ্যাকাউন্ট তৈরির জন্য এই এন্ডপয়েন্টটি ব্যবহৃত হয়।

- **URL:** `/api/v1/auth/register`
- **Method:** `POST`
- **Auth Guard:** Public (কোনো টোকেনের প্রয়োজন নেই)
- **HTTP Status Code:** `201 Created`

### কাজের ফ্লো (Step-by-Step Logic):
1. ক্লায়েন্ট থেকে আসা ডেটা `RegisterDto` এবং `class-validator` দ্বারা স্বয়ংক্রিয়ভাবে ফিল্টার ও ভ্যালিডেট হয়।
2. ইমেইল স্পেস ট্রিম করে সম্পূর্ণ লোয়ারকেসে কনভার্ট করা হয় (`john@example.com` ও `JOHN@example.com` একই হিসেবে গণ্য)।
3. ডাটাবেজে এই ইমেইলে কোনো ইউজার আগে থেকেই আছে কি না তা যাচাই করা হয়। থাকলে `409 ConflictException` দেওয়া হয়।
4. `bcrypt` দিয়ে পাসওয়ার্ড হ্যাশ করা হয়।
5. ডিফল্ট রোল `CUSTOMER` এবং স্ট্যাটাস `ACTIVE` দিয়ে ডাটাবেজে ইউজার রেকর্ড তৈরি হয়।
6. JWT `accessToken` ও `refreshToken` তৈরি হয়।
7. রিফ্রেশ টোকেন হ্যাশ করে ইউজারের `refreshTokenHash` কলামে সংরক্ষণ করা হয়।

### রিকোয়েস্ট পেলোড (Request Body):
```json
{
  "name": "Emon Hossain",
  "email": "emon@example.com",
  "password": "StrongPassword123!",
  "photoUrl": "https://example.com/avatar.jpg",
  "phoneNumber": "+8801700000000"
}
```

> **ভ্যালিডেশন নিয়ম:**
> - `name`: স্ট্রিং, ২ থেকে ১০০ ক্যারেক্টার (বাধ্যতামূলক)।
> - `email`: সঠিক ইমেইল ফরম্যাট (বাধ্যতামূলক)।
> - `password`: সর্বনিম্ন ৮ এবং সর্বোচ্চ ৬৪ ক্যারেক্টার। অন্তত ১টি বড় হাতের অক্ষর, ১টি ছোট হাতের অক্ষর, ১টি সংখ্যা এবং ১টি স্পেশাল ক্যারেক্টার থাকতে হবে (বাধ্যতামূলক)।
> - `photoUrl`: সঠিক URL ফরম্যাট (ঐচ্ছিক)।
> - `phoneNumber`: স্ট্রিং, সর্বোচ্চ ২০ ক্যারেক্টার (ঐচ্ছিক)।

### সফল রেসপন্স (Success Response - 201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c1f7a0b3-9c8e-4a6f-b2d1-e5a9f3b8c7d0",
    "name": "Emon Hossain",
    "email": "emon@example.com",
    "photoUrl": "https://example.com/avatar.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

### সম্ভাব্য এরর রেসপন্সসমূহ:
- **৪০০ Bad Request (ভ্যালিডেশন ফেইল):**
  ```json
  {
    "message": [
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "Please provide a valid email address"
    ],
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- **৪০৯ Conflict (ইমেইল পূর্বে ব্যবহৃত):**
  ```json
  {
    "message": "An account with this email address already exists",
    "error": "Conflict",
    "statusCode": 409
  }
  ```

---

## ৩. ইউজার লগইন (Login Flow)

পূর্বে নিবন্ধিত ইউজারদের সিস্টেমে লগইন করার জন্য এই এন্ডপয়েন্ট ব্যবহৃত হয়।

- **URL:** `/api/v1/auth/login`
- **Method:** `POST`
- **Auth Guard:** Public
- **HTTP Status Code:** `200 OK`

### কাজের ফ্লো (Step-by-Step Logic):
1. ইমেইল ও পাসওয়ার্ড পাঠানো হয়।
2. ডাটাবেজে ইউজার খোঁজা হয়। ইউজার না পাওয়া গেলে সরাসরি `401 Unauthorized` দেওয়া হয়।
3. ইউজারের অ্যাকাউন্ট স্ট্যাটাস চেক করা হয়। স্ট্যাটাস যদি `INACTIVE` থাকে, তবে এক্সেস ব্লক করে `401 Unauthorized` দেওয়া হয়।
4. `bcrypt.compare` দিয়ে পাসওয়ার্ড হ্যাশ মেলানো হয়। পাসওয়ার্ড ভুল হলে `401 Unauthorized` দেওয়া হয়।
5. টাইমিং-সেফ সিকিউরিটি: ইমেইল না মিললেও বা পাসওয়ার্ড ভুল হলেও একই এরর মেসেজ দেওয়া হয় (`Invalid email or password`), যাতে অ্যাটাকার বুঝতে না পারে ইমেইলটি সিস্টেমে আছে কি না।
6. লগইন সফল হলে নতুন `accessToken` এবং `refreshToken` তৈরি হয় এবং রিফ্রেশ টোকেন হ্যাশ ডাটাবেজে আপডেট হয়।

### রিকোয়েস্ট পেলোড (Request Body):
```json
{
  "email": "emon@example.com",
  "password": "StrongPassword123!"
}
```

### সফল রেসপন্স (Success Response - 200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c1f7a0b3-9c8e-4a6f-b2d1-e5a9f3b8c7d0",
    "name": "Emon Hossain",
    "email": "emon@example.com",
    "photoUrl": "https://example.com/avatar.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

### সম্ভাব্য এরর রেসপন্সসমূহ:
- **৪০১ Unauthorized (ভুল ইমেইল বা পাসওয়ার্ড):**
  ```json
  {
    "message": "Invalid email or password",
    "error": "Unauthorized",
    "statusCode": 401
  }
  ```
- **৪০১ Unauthorized (অ্যাকাউন্ট নিষ্ক্রিয়):**
  ```json
  {
    "message": "Your account is currently inactive or suspended",
    "error": "Unauthorized",
    "statusCode": 401
  }
  ```

---

## ৪. ইউজার লগআউট (Logout Flow)

লগইন থাকা ইউজারের সেশন সমাপ্ত করতে এবং রিফ্রেশ টোকেন অকার্যকর করতে এই এন্ডপয়েন্ট ব্যবহৃত হয়।

- **URL:** `/api/v1/auth/logout`
- **Method:** `POST`
- **Auth Guard:** Protected (`JwtAuthGuard` আবশ্যক)
- **HTTP Status Code:** `200 OK`

### কাজের ফ্লো (Step-by-Step Logic):
1. ক্লায়েন্টকে রিকোয়েস্টের Headers-এ অ্যাক্সেস টোকেন পাঠাতে হবে।
2. `JwtAuthGuard` টোকেনটি ভ্যালিডেট করে এবং ইউজারের আইডি বের করে।
3. ডাটাবেজে ওই ইউজারের `refreshTokenHash` ফিল্ডটি নাল (`null`) করে দেওয়া হয়।
4. ফলে ক্লায়েন্ট বা কোনো থার্ড পার্টির কাছে পূর্বে ইস্যু করা রিফ্রেশ টোকেনটি থাকলেও তা দিয়ে আর নতুন টোকেন জেনারেট করা যাবে না।

### রিকোয়েস্ট হেডার্স (Request Headers):
```http
Authorization: Bearer <YOUR_ACCESS_TOKEN>
```

*(রিকোয়েস্টের বডিতে কোনো ডেটা পাঠানোর প্রয়োজন নেই)*

### সফল রেসপন্স (Success Response - 200 OK):
```json
{
  "message": "Logged out successfully"
}
```

### সম্ভাব্য এরর রেসপন্স:
- **৪০১ Unauthorized (টোকেন না দেওয়া হলে বা মেয়াদোত্তীর্ণ হলে):**
  ```json
  {
    "message": "Unauthorized",
    "statusCode": 401
  }
  ```

---

## ৫. প্রোফাইল দেখা (Get Profile - /auth/me)

লগইন থাকা বর্তমান ইউজারের তথ্য দেখার এন্ডপয়েন্ট।

- **URL:** `/api/v1/auth/me`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <YOUR_ACCESS_TOKEN>`
- **HTTP Status Code:** `200 OK`

### সফল রেসপন্স:
```json
{
  "user": {
    "id": "c1f7a0b3-9c8e-4a6f-b2d1-e5a9f3b8c7d0",
    "email": "emon@example.com",
    "name": "Emon Hossain",
    "photoUrl": "https://example.com/avatar.jpg",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

---

## ৬. রোল-বেসড সিকিউরিটি এক্সাম্পল (/auth/admin-only)

এডমিন গার্ড কীভাবে কাজ করে তা প্রদর্শনের জন্য এন্ডপয়েন্ট।

- **URL:** `/api/v1/auth/admin-only`
- **Method:** `GET`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`
- **Decorator:** `@Roles(UserRole.ADMIN)`

### রেসপন্স:
- ইউজার **ADMIN** হলে: `200 OK`
  ```json
  {
    "message": "Access granted to admin area",
    "adminUser": { ... }
  }
  ```
- ইউজার **CUSTOMER** হলে: `403 Forbidden`
  ```json
  {
    "message": "Access denied: Required role (ADMIN), but current role is (CUSTOMER)",
    "error": "Forbidden",
    "statusCode": 403
  }
  ```

