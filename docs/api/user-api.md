# User API Documentation (ইউজার ম্যানেজমেন্ট ও প্রোফাইল এপিআই)

এই ডকুমেন্টে `User` মডিউলের ৫টি কোর এন্ডপয়েন্টের ফ্লো, রিকোয়েস্ট পেলোড, হেডার্স এবং রেসপন্স বিস্তারিতভাবে দেওয়া হলো।

সবগুলো এন্ডপয়েন্টেই রিকোয়েস্টের হেডার্সে টোকেন পাঠাতে হবে:
```http
Authorization: <YOUR_ACCESS_TOKEN>
```
*(নোট: সরাসরি টোকেন অথবা `Bearer <YOUR_ACCESS_TOKEN>` উভয়ই সমর্থিত)*

---

## ১. Get All Users (অ্যাডমিন: সমস্ত ইউজারের তালিকা)

- **URL:** `/api/v1/user`
- **Method:** `GET`
- **Guards:** `JwtAuthGuard`, `RolesGuard` (`ADMIN` রোল আবশ্যক)
- **Query Parameters (ঐচ্ছিক):**
  - `page`: পেজ নম্বর (ডিফল্ট: 1)
  - `limit`: প্রতি পেজে ইউজারের সংখ্যা (ডিফল্ট: 10, সর্বোচ্চ: 100)
  - `search`: নাম, ইমেইল অথবা ফোন নম্বরে সার্চ
  - `role`: `ADMIN` বা `USER` ফিল্টারিং
  - `status`: `ACTIVE` বা `INACTIVE` ফিল্টারিং

### সফল রেসপন্স (200 OK):
```json
{
  "data": [
    {
      "id": "e81d8fd4-9ba0-4256-a197-a648e2443e2a",
      "name": "Emon Hossain",
      "email": "emon@example.com",
      "photoUrl": "https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/123.jpg",
      "phoneNumber": "+8801700000000",
      "role": "ADMIN",
      "status": "ACTIVE",
      "createdAt": "2026-11-03T07:00:00.000Z",
      "updatedAt": "2026-11-03T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## ২. Get My Profile (নিজের প্রোফাইল দেখা)

- **URL:** `/api/v1/user/me`
- **Method:** `GET`
- **Guards:** `JwtAuthGuard` (লগইন করা যেকোনো ইউজার)

### সফল রেসপন্স (200 OK):
```json
{
  "data": {
    "id": "e81d8fd4-9ba0-4256-a197-a648e2443e2a",
    "name": "Emon Hossain",
    "email": "emon@example.com",
    "photoUrl": "https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/123.jpg",
    "phoneNumber": "+8801700000000",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-11-03T07:00:00.000Z",
    "updatedAt": "2026-11-03T07:00:00.000Z"
  }
}
```

---

## ৩. Update My Profile (নিজের প্রোফাইল আপডেট)

- **URL:** `/api/v1/user/me`
- **Method:** `PATCH`
- **Guards:** `JwtAuthGuard`
- **Request Body (JSON):**
```json
{
  "name": "Emon Hossain Updated",
  "photoUrl": "https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/new-avatar.png",
  "phoneNumber": "+8801800000000"
}
```

### সফল রেসপন্স (200 OK):
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "e81d8fd4-9ba0-4256-a197-a648e2443e2a",
    "name": "Emon Hossain Updated",
    "email": "emon@example.com",
    "photoUrl": "https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/new-avatar.png",
    "phoneNumber": "+8801800000000",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-11-03T07:00:00.000Z",
    "updatedAt": "2026-11-03T10:10:00.000Z"
  }
}
```

---

## ৪. Change User Status (অ্যাডমিন: ইউজারের স্ট্যাটাস পরিবর্তন)

- **URL:** `/api/v1/user/:id/status`
- **Method:** `PATCH`
- **Guards:** `JwtAuthGuard`, `RolesGuard` (`ADMIN` রোল আবশ্যক)
- **Request Body (JSON):**
```json
{
  "status": "INACTIVE"
}
```
*(সম্ভাব্য মান: `ACTIVE` অথবা `INACTIVE`)*

> [!NOTE]
> কোনো ইউজারের স্ট্যাটাস `INACTIVE` করা হলে সিস্টেমে থাকা তার সমস্ত সক্রিয় রিফ্রেশ টোকেন তাৎক্ষণিকভাবে বাতিল (revoke) হয়ে যায়। এছাড়া অ্যাডমিন নিজের অ্যাকাউন্ট নিজে নিষ্ক্রিয় করতে পারবে না।

### সফল রেসপন্স (200 OK):
```json
{
  "message": "User status changed to INACTIVE successfully",
  "data": {
    "id": "user-uuid-123",
    "name": "Customer User",
    "email": "customer@example.com",
    "photoUrl": null,
    "phoneNumber": null,
    "role": "USER",
    "status": "INACTIVE",
    "createdAt": "2026-11-03T07:00:00.000Z",
    "updatedAt": "2026-11-03T10:15:00.000Z"
  }
}
```

---

## ৫. Delete My Profile (নিজের অ্যাকাউন্ট ডিলিট বা নিষ্ক্রিয় করা)

- **URL:** `/api/v1/user/me`
- **Method:** `DELETE`
- **Guards:** `JwtAuthGuard`

### লজিক ও কর্নার কেস:
1. ইউজারের যদি কোনো অর্ডার হিস্ট্রি (`Order`) **না থাকে**, তবে ডাটাবেজ থেকে তার অ্যাকাউন্ট সম্পূর্ণ ডিলিট (`Hard Delete`) হবে।
2. ইউজারের যদি পূর্ববর্তী অর্ডার রেকর্ড থাকে, তবে অডিট ও কমার্স হিসাবরক্ষণের সুরক্ষায় অ্যাকাউন্টটি সরাসরি মুছে না ফেলে `status: INACTIVE` করা হয় এবং টোকেন বাতিল করা হয় (`Soft Deactivate`)।

### সফল রেসপন্স (200 OK):
```json
{
  "message": "Account deleted successfully"
}
```
অথবা (অর্ডার হিস্ট্রি থাকলে):
```json
{
  "message": "Account has order history and was deactivated successfully"
}
```

