# Etrog ERP - Complete API Schema Documentation

## Table of Contents
- [Authentication](#authentication)
- [Authorization](#authorization)
- [API Tags / Controllers](#api-tags--controllers)
  - [Auth](#auth)
  - [Users](#users)
  - [Partners](#partners)
  - [Categories](#categories)
  - [Operations](#operations)
  - [Inventory](#inventory)
  - [Logistics](#logistics)
  - [Messages](#messages)
  - [Seasons](#seasons)
  - [General](#general)

---

## Authentication

All endpoints require a JWT (JSON Web Token) in the `Authorization` header, except for the `/auth/login` endpoint which is marked with `@Public()`.

### JWT Token Format
```
Authorization: Bearer <jwt_token>
```

### Response on Authentication Failure
- **401 Unauthorized**: JWT authentication failed or token is missing.
- **403 Forbidden**: Access denied due to insufficient role or inactive user.

---

## Authorization

The system has three role levels:

| Role | Level | Permissions |
|------|-------|-------------|
| **OWNER** | 3 | Full system access |
| **MANAGER** | 2 | Most operations (cannot delete seasons, manage users' roles) |
| **WORKER** | 1 | Limited access (view only, basic operations, cannot create seasons) |

Users must also have `isActive = true` to use the system.

---

## API Tags / Controllers

### Auth
**Base URL**: `/auth`  
**Role Requirements**: See individual endpoints

#### 1. Login (Public)
- **Endpoint**: `POST /auth/login`
- **Access**: Public (no JWT required)
- **Description**: Login with email and password to receive JWT access token
- **Request Body**:
  ```json
  {
    "email": "owner@etrog-erp.com",
    "password": "Password123"
  }
  ```
- **Response** (200):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "owner_user",
      "email": "owner@etrog-erp.com",
      "role": "OWNER",
      "isActive": true
    }
  }
  ```
- **Error Responses**:
  - **401**: Invalid email or password

#### 2. Get Authenticated User Profile
- **Endpoint**: `GET /auth/me`
- **Access**: Authenticated users only
- **Description**: Get authenticated user profile from JWT token
- **Response** (200):
  ```json
  {
    "id": 1,
    "name": "owner_user",
    "email": "owner@etrog-erp.com",
    "role": "OWNER",
    "isActive": true,
    "slug": "owner-user"
  }
  ```

#### 3. Logout
- **Endpoint**: `POST /auth/logout`
- **Access**: Authenticated users only
- **Description**: Logout current user (JWT stateless logout acknowledgment)
- **Response** (200):
  ```json
  {
    "message": "Logout acknowledged"
  }
  ```

---

### Users
**Base URL**: `/users`  
**Role Requirements**: MANAGER/OWNER for modifications

#### 1. Create User (Public)
- **Endpoint**: `POST /users`
- **Access**: Public (no JWT required)
- **Description**: Create a new system user. Unique constraints: [name], [email], [phone]
- **Request Body**:
  ```json
  {
    "name": "warehouse_manager",
    "email": "manager@etrog-erp.com",
    "phone": "0541112233",
    "password": "StrongPass123!"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 2,
    "name": "warehouse_manager",
    "email": "manager@etrog-erp.com",
    "phone": "0541112233",
    "role": "WORKER",
    "isActive": false,
    "slug": "warehouse-manager",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input, forbidden fields (role/isActive), or duplicate name/email/phone

#### 2. Get All Users
- **Endpoint**: `GET /users`
- **Access**: Authenticated users
- **Description**: Retrieve list of all system users. MANAGER+: full details, WORKER: names only
- **Response** (200):
  ```json
  [
    {
      "id": 1,
      "name": "owner_user",
      "email": "owner@etrog-erp.com",
      "phone": "0501111111",
      "role": "OWNER",
      "isActive": true,
      "slug": "owner-user"
    },
    {
      "id": 2,
      "name": "warehouse_manager",
      "email": "manager@etrog-erp.com",
      "phone": "0541112233",
      "role": "MANAGER",
      "isActive": true,
      "slug": "warehouse-manager"
    }
  ]
  ```

#### 3. Get Single User
- **Endpoint**: `GET /users/:idOrSlug`
- **Access**: MANAGER+ or the user themself
- **Parameters**:
  - `idOrSlug` (string): Numeric ID or unique slug identifier
- **Response** (200): User object (same as Get All Users single entry)
- **Error Responses**:
  - **404**: User not found
  - **403**: You can only access your own user unless you are manager/owner

#### 4. Update User
- **Endpoint**: `PATCH /users/:id`
- **Access**: MANAGER+ (can modify other users), any user can modify self
- **Parameters**:
  - `id` (number): User ID to update
- **Request Body** (all fields optional):
  ```json
  {
    "name": "warehouse_manager_new",
    "email": "manager.new@etrog-erp.com",
    "phone": "0541234567",
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!",
    "role": "MANAGER",
    "isActive": true
  }
  ```
- **Response** (200): Updated user object
- **Error Responses**:
  - **404**: User not found
  - **400**: Invalid input data

#### 5. Delete User
- **Endpoint**: `DELETE /users/:id`
- **Access**: MANAGER/OWNER only
- **Parameters**:
  - `id` (number): User ID to delete
- **Response** (200):
  ```json
  {
    "message": "User deleted successfully"
  }
  ```
- **Error Responses**:
  - **404**: User not found

---

### Partners
**Base URL**: `/traders` and `/customers`  
**Role Requirements**: MANAGER/OWNER for modifications

#### Traders

##### 1. Register Trader
- **Endpoint**: `POST /traders`
- **Access**: MANAGER/OWNER
- **Description**: Register a new trader. Unique constraint: [name]
- **Request Body**:
  ```json
  {
    "name": "Trader Cohen",
    "paymentPercent": 12.5
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 3,
    "name": "Trader Cohen",
    "paymentPercent": 12.5,
    "slug": "trader-cohen",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate trader name

##### 2. Get All Traders
- **Endpoint**: `GET /traders`
- **Access**: Authenticated users
- **Description**: Retrieve list of all traders. WORKER returns only id and name
- **Response** (200):
  ```json
  [
    {
      "id": 1,
      "name": "Trader Levi",
      "paymentPercent": 15,
      "slug": "trader-levi"
    },
    {
      "id": 3,
      "name": "Trader Cohen",
      "paymentPercent": 12.5,
      "slug": "trader-cohen"
    }
  ]
  ```

##### 3. Get Single Trader
- **Endpoint**: `GET /traders/:idOrSlug`
- **Access**: Authenticated users
- **Parameters**:
  - `idOrSlug` (string): Numeric ID or slug
- **Response** (200): Trader object
- **Error Responses**:
  - **404**: Trader not found

##### 4. Update Trader
- **Endpoint**: `PATCH /traders/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Trader ID
- **Request Body**:
  ```json
  {
    "name": "Trader Levi Updated",
    "paymentPercent": 18
  }
  ```
- **Response** (200): Updated trader object
- **Error Responses**:
  - **404**: Trader not found
  - **400**: Invalid input data

##### 5. Delete Trader
- **Endpoint**: `DELETE /traders/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Trader ID
- **Response** (200):
  ```json
  {
    "message": "Trader removed successfully"
  }
  ```
- **Error Responses**:
  - **404**: Trader not found

#### Customers

##### 1. Register Customer
- **Endpoint**: `POST /customers`
- **Access**: MANAGER/OWNER
- **Description**: Register a new customer. Unique constraints: [customerName], [email], [phone]
- **Request Body**:
  ```json
  {
    "customerName": "Fresh Market Ltd",
    "email": "orders@fresh-market.co.il",
    "phone": "0501234567"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 5,
    "customerName": "Fresh Market Ltd",
    "email": "orders@fresh-market.co.il",
    "phone": "0501234567",
    "slug": "fresh-market-ltd",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate customer name/email/phone

##### 2. Get All Customers
- **Endpoint**: `GET /customers`
- **Access**: Authenticated users
- **Description**: Retrieve list of all customers. WORKER returns only id and customerName
- **Response** (200):
  ```json
  [
    {
      "id": 5,
      "customerName": "Fresh Market Ltd",
      "email": "orders@fresh-market.co.il",
      "phone": "0501234567",
      "slug": "fresh-market-ltd"
    }
  ]
  ```

##### 3. Get Single Customer
- **Endpoint**: `GET /customers/:idOrSlug`
- **Access**: Authenticated users
- **Parameters**:
  - `idOrSlug` (string): Numeric ID or slug
- **Response** (200): Customer object
- **Error Responses**:
  - **404**: Customer not found

##### 4. Update Customer
- **Endpoint**: `PATCH /customers/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Customer ID
- **Request Body**:
  ```json
  {
    "customerName": "Global Fruits GmbH",
    "email": "logistics@globalfruits.eu",
    "phone": "0527654321"
  }
  ```
- **Response** (200): Updated customer object
- **Error Responses**:
  - **404**: Customer not found
  - **400**: Invalid input data

##### 5. Delete Customer
- **Endpoint**: `DELETE /customers/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Customer ID
- **Response** (200):
  ```json
  {
    "message": "Customer removed successfully"
  }
  ```
- **Error Responses**:
  - **404**: Customer not found

---

### Categories
**Base URL**: `/traders-categories`, `/customer-categories`, `/trader-shares`  
**Role Requirements**: MANAGER/OWNER

#### Trader Categories

##### 1. Create Trader Category
- **Endpoint**: `POST /traders-categories`
- **Access**: MANAGER/OWNER
- **Description**: Create a new trader category for the active season. Unique constraint: [name, seasonId]
- **Request Body**:
  ```json
  {
    "name": "Yanover Premium",
    "notes": "Large-size export category"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 2,
    "name": "Yanover Premium",
    "notes": "Large-size export category",
    "seasonId": 1,
    "isDefault": false,
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate category name within the season

##### 2. Get Trader Categories by Season
- **Endpoint**: `GET /traders-categories`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200):
  ```json
  [
    {
      "id": 1,
      "name": "Standard",
      "notes": null,
      "seasonId": 1,
      "isDefault": true,
      "createdAt": "2026-10-05T08:00:00Z",
      "updatedAt": "2026-10-05T08:00:00Z"
    }
  ]
  ```
- **Error Responses**:
  - **400**: Invalid or missing seasonId

##### 3. Get Trader Category by Name
- **Endpoint**: `GET /traders-categories/by-name`
- **Access**: Authenticated users
- **Query Parameters**:
  - `name` (string, required): Category name
  - `seasonId` (number, required): Season ID
- **Response** (200): Single category object
- **Error Responses**:
  - **404**: No category found with the given name

##### 4. Get Single Trader Category
- **Endpoint**: `GET /traders-categories/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Category ID
- **Response** (200): Category object
- **Error Responses**:
  - **404**: Trader category not found

##### 5. Update Trader Category
- **Endpoint**: `PATCH /traders-categories/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Category ID
- **Request Body**:
  ```json
  {
    "name": "Yanover Premium Updated",
    "notes": "Updated classification notes"
  }
  ```
- **Response** (200): Updated category object
- **Error Responses**:
  - **404**: Trader category not found
  - **400**: Invalid input data

##### 6. Delete Trader Category
- **Endpoint**: `DELETE /traders-categories/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Category ID
- **Response** (200):
  ```json
  {
    "message": "Trader category deleted successfully"
  }
  ```
- **Error Responses**:
  - **404**: Trader category not found

#### Customer Categories

##### 1. Set Customer Category and Price
- **Endpoint**: `POST /customer-categories`
- **Access**: MANAGER/OWNER
- **Description**: Create or update a customer category with its price for a season. Unique constraint: [seasonId, customerId, name, grade]
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "customerId": 5,
    "name": "Yanover",
    "grade": "א",
    "price": 125.5,
    "currency": "ILS"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 11,
    "seasonId": 1,
    "customerId": 5,
    "name": "Yanover",
    "grade": "א",
    "price": 125.5,
    "currency": "ILS",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate category

##### 2. Get Customer Categories by Customer
- **Endpoint**: `GET /customer-categories/by-customer`
- **Access**: Authenticated users
- **Query Parameters**:
  - `customerId` (number, required): Customer ID
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of customer categories
- **Error Responses**:
  - **400**: Invalid or missing parameters

##### 3. Get Customer Category by Name and Grade
- **Endpoint**: `GET /customer-categories/by-customer-and-name-grade`
- **Access**: Authenticated users
- **Query Parameters**:
  - `customerId` (number, required): Customer ID
  - `seasonId` (number, required): Season ID
  - `name` (string, required): Category name
  - `grade` (enum, required): Grade (א, ב, ג, etc.)
- **Response** (200): Single category object
- **Error Responses**:
  - **404**: No category found

##### 4. Get All Customer Categories by Season
- **Endpoint**: `GET /customer-categories`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of all customer categories for the season
- **Error Responses**:
  - **400**: Invalid season ID

##### 5. Get Single Customer Category
- **Endpoint**: `GET /customer-categories/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Category ID
- **Response** (200): Category object
- **Error Responses**:
  - **404**: Customer category not found

##### 6. Update Customer Category
- **Endpoint**: `PATCH /customer-categories/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Category ID
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "customerId": 5,
    "name": "Yanover Updated",
    "grade": "א",
    "price": 135.5,
    "currency": "ILS"
  }
  ```
- **Response** (200): Updated category object
- **Error Responses**:
  - **404**: Customer category not found
  - **400**: Invalid input data

##### 7. Delete Customer Category
- **Endpoint**: `DELETE /customer-categories/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Category ID
- **Response** (200):
  ```json
  {
    "message": "Customer category deleted successfully"
  }
  ```
- **Error Responses**:
  - **404**: Customer category not found

#### Trader Category Shares

##### 1. Set Trader Category Share
- **Endpoint**: `POST /trader-shares`
- **Access**: MANAGER/OWNER
- **Description**: Set or upsert a trader's percentage share in a season. Unique constraint: [traderId, traderCategoryId, seasonId]
- **Request Body**:
  ```json
  {
    "traderId": 3,
    "traderCategoryId": 2,
    "percent": 35.5
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 8,
    "seasonId": 1,
    "traderId": 3,
    "traderCategoryId": 2,
    "percent": 35.5,
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input data

##### 2. Get Trader Shares by Season
- **Endpoint**: `GET /trader-shares`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of share records
- **Error Responses**:
  - **400**: Invalid or missing seasonId

##### 3. Get Trader Share by Trader and Category
- **Endpoint**: `GET /trader-shares/by-trader-category`
- **Access**: Authenticated users
- **Query Parameters**:
  - `traderId` (number, required): Trader ID
  - `traderCategoryId` (number, required): Category ID
  - `seasonId` (number, required): Season ID
- **Response** (200): Share record
- **Error Responses**:
  - **404**: No share found

##### 4. Get Single Trader Share
- **Endpoint**: `GET /trader-shares/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Share ID
- **Response** (200): Share object
- **Error Responses**:
  - **404**: Share record not found

##### 5. Update Trader Share
- **Endpoint**: `PATCH /trader-shares/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Share ID
- **Request Body**:
  ```json
  {
    "percent": 42
  }
  ```
- **Response** (200): Updated share object
- **Error Responses**:
  - **404**: Share record not found
  - **400**: Invalid input data

##### 6. Delete Trader Share
- **Endpoint**: `DELETE /trader-shares/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Share ID
- **Response** (200):
  ```json
  {
    "message": "Share record deleted successfully"
  }
  ```
- **Error Responses**:
  - **404**: Share record not found

---

### Operations
**Base URL**: `/harvests` and `/classifications`

#### Field Harvests

##### 1. Record New Harvest
- **Endpoint**: `POST /harvests`
- **Access**: Authenticated users
- **Description**: Record a new field harvest entry
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "dateGregorian": "2026-10-05T06:00:00.000Z",
    "dateHebrew": "י\"ב תשרי תשפ\"ז",
    "fieldId": 2,
    "updatedById": 1,
    "totalHarvested": 1500,
    "totalRejected": 0,
    "notes": "Field 2 harvest"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 1,
    "seasonId": 1,
    "dateGregorian": "2026-10-05T06:00:00.000Z",
    "dateHebrew": "י\"ב תשרי תשפ\"ז",
    "fieldId": 2,
    "updatedById": 1,
    "totalHarvested": 1500,
    "totalRejected": 0,
    "rejectionRate": 0,
    "totalAfterRejected": 1500,
    "classifiedTotal": 0,
    "isPartialClassification": false,
    "notes": "Field 2 harvest",
    "slug": "2026-10-05-field-2-season-1",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input data

##### 2. Get All Harvests by Season
- **Endpoint**: `GET /harvests`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of harvest records
- **Error Responses**:
  - **400**: Invalid or missing seasonId

##### 3. Get Single Harvest
- **Endpoint**: `GET /harvests/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Harvest ID
- **Response** (200): Harvest object
- **Error Responses**:
  - **404**: Harvest record not found

##### 4. Find Harvest by Field and Date
- **Endpoint**: `GET /harvests/search`
- **Access**: Authenticated users
- **Query Parameters**:
  - `fieldName` (string, required): Field name
  - `date` (string, required): Date in ISO format (YYYY-MM-DD)
- **Response** (200): Matching harvest record
- **Error Responses**:
  - **404**: No harvest found for the given field and date

##### 5. Update Harvest
- **Endpoint**: `PATCH /harvests/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Harvest ID
- **Request Body**:
  ```json
  {
    "totalHarvested": 1630,
    "totalRejected": 90,
    "notes": "Updated after quality review"
  }
  ```
- **Response** (200): Updated harvest object
- **Error Responses**:
  - **404**: Harvest record not found
  - **400**: Invalid input data

##### 6. Delete Harvest
- **Endpoint**: `DELETE /harvests/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Harvest ID
- **Response** (200):
  ```json
  {
    "message": "Harvest record deleted successfully"
  }
  ```
- **Error Responses**:
  - **404**: Harvest record not found

#### Classifications

##### 1. Get Classifications by Harvest
- **Endpoint**: `GET /classifications/harvest/:harvestId`
- **Access**: Authenticated users
- **Parameters**:
  - `harvestId` (number): Harvest ID
- **Response** (200): Array of classifications for the harvest
- **Error Responses**:
  - **404**: Field harvest not found

##### 2. Get All Classifications by Season
- **Endpoint**: `GET /classifications`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of classifications
- **Error Responses**:
  - **400**: Invalid or missing seasonId

---

### Inventory
**Base URL**: `/inventory`, `/trader-stock`, `/customer-allocations`

#### Combined Inventory

##### 1. Get Combined Inventory Summary
- **Endpoint**: `GET /inventory/summary`
- **Access**: Authenticated users
- **Description**: Combined trader + customer inventory totals with shared and side-specific filters
- **Query Parameters**:
  - `seasonId` (number, optional): Season ID. Defaults to active season
  - `movementScope` (enum, optional): ALL, SHIPPED, UNSHIPPED, PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT
  - `pitamStatus` (enum, optional): WITH_PITAM, WITHOUT_PITAM, MIXED
  - `ownerScope` (enum, optional): ALL, TRADER, MODULO (trader side only)
  - `traderId` (number, optional): Trader ID (required when ownerScope=TRADER)
  - `traderCategoryId` (number, optional): Trader category ID
  - `grade` (enum, optional): Grade (א-ו)
  - `customerId` (number, optional): Customer ID
  - `customerCategoryId` (number, optional): Customer category ID
- **Response** (200):
  ```json
  {
    "traderInventory": [
      {
        "traderId": 3,
        "traderName": "Trader Cohen",
        "traderCategoryId": 2,
        "traderCategoryName": "Yanover",
        "grade": "א",
        "pitamStatus": "WITH_PITAM",
        "totalQuantity": 500
      }
    ],
    "customerInventory": [
      {
        "customerId": 5,
        "customerName": "Fresh Market Ltd",
        "customerCategoryId": 11,
        "customerCategoryName": "Yanover",
        "pitamStatus": "WITH_PITAM",
        "totalQuantity": 200
      }
    ]
  }
  ```

##### 2. Create Internal Transfer
- **Endpoint**: `POST /inventory/internal-transfer`
- **Access**: Authenticated users
- **Description**: Create internal transfer with both sides (INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED)
- **Request Body** (example - Trader to Customer):
  ```json
  {
    "type": "INTERNAL_TRANSFER",
    "date": "2026-10-10T09:00:00.000Z",
    "dateHebrew": "יז תשרי תשפז",
    "quantity": 80,
    "fromOwnerType": "TRADER",
    "fromTraderId": 4,
    "fromTraderCategoryId": 3,
    "fromGrade": "א",
    "fromPitamStatus": "WITH_PITAM",
    "toOwnerType": "CUSTOMER",
    "toCustomerId": 5,
    "toCustomerCategoryId": 11,
    "toPitamStatus": "WITHOUT_PITAM",
    "updatedById": 1,
    "notes": "Reserved for customer order #A120"
  }
  ```
- **Response** (201): Transaction confirmation
- **Error Responses**:
  - **400**: Invalid payload or unsupported owner flow

##### 3. Create Customer General Transfer
- **Endpoint**: `POST /inventory/customer-general-transfer`
- **Access**: Authenticated users
- **Description**: Create customer allocation from general pool. System consumes modulo first, then completes from trader shares if needed
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "date": "2026-10-10T09:00:00.000Z",
    "dateHebrew": "יז תשרי תשפז",
    "customerId": 5,
    "customerCategoryId": 11,
    "pitamStatus": "WITH_PITAM",
    "quantity": 100,
    "updatedById": 1,
    "notes": "General allocation"
  }
  ```
- **Response** (201): Transaction confirmation with split details

#### Trader Stock

##### 1. Record Stock Movement
- **Endpoint**: `POST /trader-stock/movement`
- **Access**: Authenticated users
- **Description**: Record a new trader stock movement
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "date": "2026-10-08T08:30:00.000Z",
    "traderId": 3,
    "traderCategoryId": 2,
    "grade": "ב",
    "pitamStatus": "WITH_PITAM",
    "quantity": 200,
    "type": "HARVEST_IN",
    "updatedById": 1,
    "notes": "Inbound from sorting line"
  }
  ```
- **Response** (201): Movement record
- **Error Responses**:
  - **400**: Invalid movement data

##### 2. Get Trader Stock Balance
- **Endpoint**: `GET /trader-stock/balance`
- **Access**: Authenticated users
- **Description**: Get net stock balance for a trader category
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `traderCategoryId` (number, required): Category ID
  - `grade` (enum, required): Grade
  - `pitamStatus` (enum, required): Pitam status
  - `traderId` (number, optional): Trader ID. Omit for Modulo balance
- **Response** (200):
  ```json
  {
    "seasonId": 1,
    "traderId": 3,
    "traderCategoryId": 2,
    "grade": "ב",
    "pitamStatus": "WITH_PITAM",
    "balance": 450
  }
  ```

##### 3. Get Trader Stock Movement History
- **Endpoint**: `GET /trader-stock/history`
- **Access**: Authenticated users
- **Description**: Retrieve full movement history for a trader
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `traderId` (number, required): Trader ID
  - `traderCategoryId` (number, required): Category ID
- **Response** (200): Array of movements

##### 4. Get Trader Stock Ledger
- **Endpoint**: `GET /trader-stock/ledger`
- **Access**: Authenticated users
- **Description**: Retrieve full stock ledger for a trader across all categories
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `traderId` (number, required): Trader ID
- **Response** (200): Ledger with all transactions

#### Customer Allocations

##### 1. Record Customer Allocation
- **Endpoint**: `POST /customer-allocations`
- **Access**: Authenticated users
- **Description**: Record a new customer allocation (sale or transfer)
- **Request Body**:
  ```json
  {
    "seasonId": 1,
    "date": "2026-10-10T09:00:00.000Z",
    "dateHebrew": "י\"ז תשרי תשפ\"ז",
    "customerId": 5,
    "customerCategoryId": 11,
    "pitamStatus": "WITH_PITAM",
    "quantity": 80,
    "type": "HARVEST_IN",
    "takenFrom": "GENERAL",
    "updatedById": 1,
    "notes": "Reserved for customer order #A120"
  }
  ```
- **Response** (201): Allocation record
- **Error Responses**:
  - **400**: Invalid input data

##### 2. Get Customer Allocation Balance
- **Endpoint**: `GET /customer-allocations/balance`
- **Access**: Authenticated users
- **Description**: Get net allocation balance for a customer category
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `customerId` (number, required): Customer ID
  - `customerCategoryId` (number, required): Category ID
  - `pitamStatus` (enum, required): Pitam status
- **Response** (200): Balance object
- **Error Responses**:
  - **400**: Invalid or missing parameters

##### 3. Get Customer Allocations
- **Endpoint**: `GET /customer-allocations/customer/:customerId`
- **Access**: Authenticated users
- **Parameters**:
  - `customerId` (number): Customer ID
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of allocations
- **Error Responses**:
  - **400**: Invalid or missing seasonId

##### 4. Get Customer Allocation Ledger
- **Endpoint**: `GET /customer-allocations/ledger`
- **Access**: Authenticated users
- **Description**: Retrieve full allocation ledger for a customer
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `customerId` (number, required): Customer ID
- **Response** (200): Ledger with all transactions

---

### Logistics
**Base URL**: `/shipments`, `/boxes`, `/shipment-items`

#### Shipments

##### 1. Create Shipment
- **Endpoint**: `POST /shipments`
- **Access**: Authenticated users
- **Description**: Create a new shipment. ID, shipmentNumber, seasonId, totals, and slug are auto-managed
- **Request Body**:
  ```json
  {
    "updatedById": 1,
    "status": "PREPARING",
    "notes": "Shipment for EU distribution center"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 15,
    "shipmentNumber": 1,
    "seasonId": 1,
    "totalBoxes": 0,
    "totalQuantity": 0,
    "status": "PREPARING",
    "shippedAt": null,
    "notes": "Shipment for EU distribution center",
    "slug": "shipment-1-season-1",
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input data

##### 2. Get All Shipments by Season
- **Endpoint**: `GET /shipments`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
- **Response** (200): Array of shipments
- **Error Responses**:
  - **400**: Invalid or missing seasonId

##### 3. Find Shipment by Number
- **Endpoint**: `GET /shipments/by-number`
- **Access**: Authenticated users
- **Query Parameters**:
  - `seasonId` (number, required): Season ID
  - `shipmentNumber` (number, required): Shipment number
- **Response** (200): Matching shipment
- **Error Responses**:
  - **404**: Shipment not found

##### 4. Get Single Shipment
- **Endpoint**: `GET /shipments/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Shipment ID
- **Response** (200): Shipment with boxes and items
- **Error Responses**:
  - **404**: Shipment not found

##### 5. Update Shipment
- **Endpoint**: `PATCH /shipments/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Shipment ID
- **Request Body**:
  ```json
  {
    "updatedById": 2,
    "status": "SHIPPED",
    "shippedAt": "2026-10-12T13:20:00.000Z",
    "notes": "Left warehouse gate at 13:20"
  }
  ```
- **Response** (200): Updated shipment
- **Error Responses**:
  - **404**: Shipment not found
  - **400**: Invalid input data

##### 6. Delete Shipment
- **Endpoint**: `DELETE /shipments/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Shipment ID
- **Response** (200): Deletion confirmation

#### Boxes

##### 1. Create Box
- **Endpoint**: `POST /boxes`
- **Access**: Authenticated users
- **Description**: Create a new box within a shipment. seasonId and totalQuantity are auto-managed
- **Request Body**:
  ```json
  {
    "shipmentId": 15,
    "boxNumber": 3,
    "boxType": "MEDIUM",
    "updatedById": 1,
    "ownershipType": "TRADER",
    "traderId": 3,
    "notes": "Dedicated box for trader 3"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 42,
    "shipmentId": 15,
    "seasonId": 1,
    "boxNumber": 3,
    "boxType": "MEDIUM",
    "totalQuantity": 0,
    "status": "OPEN",
    "notes": "Dedicated box for trader 3",
    "ownershipType": "TRADER",
    "traderId": 3,
    "customerId": null,
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate box number

##### 2. Get Boxes by Shipment
- **Endpoint**: `GET /boxes/shipment/:shipmentId`
- **Access**: Authenticated users
- **Parameters**:
  - `shipmentId` (number): Shipment ID
- **Response** (200): Array of boxes
- **Error Responses**:
  - **404**: Shipment not found

##### 3. Get Single Box
- **Endpoint**: `GET /boxes/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Box ID
- **Response** (200): Box with items
- **Error Responses**:
  - **404**: Box not found

##### 4. Update Box
- **Endpoint**: `PATCH /boxes/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Box ID
- **Request Body**:
  ```json
  {
    "updatedById": 1,
    "status": "CLOSED",
    "notes": "Sealed and ready for dispatch"
  }
  ```
- **Response** (200): Updated box
- **Error Responses**:
  - **404**: Box not found
  - **400**: Invalid input data

##### 5. Recalculate Box Total
- **Endpoint**: `PATCH /boxes/:id/recalculate`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Box ID
- **Description**: Recalculate and update the total quantity based on items
- **Response** (200): Updated box
- **Error Responses**:
  - **404**: Box not found

##### 6. Delete Box
- **Endpoint**: `DELETE /boxes/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Box ID
- **Description**: Permanently delete a box and all its items
- **Response** (200): Deletion confirmation
- **Error Responses**:
  - **404**: Box not found

#### Shipment Items

##### 1. Create Shipment Item
- **Endpoint**: `POST /shipment-items`
- **Access**: Authenticated users
- **Description**: Create a new shipment item inside a box. Unique constraint: [seasonId, boxId, traderCategoryId, customerCategoryId, grade, pitamStatus, ownershipType, traderId, customerId]
- **Request Body**:
  ```json
  {
    "boxId": 42,
    "traderCategoryId": 2,
    "grade": "א",
    "pitamStatus": "WITH_PITAM",
    "quantity": 30,
    "ownershipType": "TRADER",
    "traderId": 3,
    "updatedById": 1,
    "notes": "Top quality batch"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 120,
    "shipmentId": 15,
    "boxId": 42,
    "seasonId": 1,
    "traderCategoryId": 2,
    "customerCategoryId": null,
    "grade": "א",
    "pitamStatus": "WITH_PITAM",
    "quantity": 30,
    "notes": "Top quality batch",
    "ownershipType": "TRADER",
    "traderId": 3,
    "customerId": null,
    "createdAt": "2026-10-11T10:30:00Z",
    "updatedAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate item

##### 2. Get Items by Box
- **Endpoint**: `GET /shipment-items/box/:boxId`
- **Access**: Authenticated users
- **Parameters**:
  - `boxId` (number): Box ID
- **Response** (200): Array of items
- **Error Responses**:
  - **404**: Box not found

##### 3. Update Shipment Item
- **Endpoint**: `PATCH /shipment-items/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Item ID
- **Request Body**:
  ```json
  {
    "quantity": 34,
    "notes": "Adjusted after final packing review"
  }
  ```
- **Response** (200): Updated item
- **Error Responses**:
  - **404**: Item not found
  - **400**: Invalid input data

##### 4. Delete Shipment Item
- **Endpoint**: `DELETE /shipment-items/:id`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Item ID
- **Description**: Soft-delete an item and update totals
- **Response** (200): Deletion confirmation
- **Error Responses**:
  - **404**: Item not found

---

### Messages
**Base URL**: `/messages`

#### 1. Send Message
- **Endpoint**: `POST /messages`
- **Access**: Authenticated users
- **Description**: Send a new internal message from one user to another
- **Request Body**:
  ```json
  {
    "recipientIds": [4],
    "subject": "Packing completed",
    "content": "Shipment #102 is ready for dispatch.",
    "priority": "NORMAL"
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 1,
    "senderId": 1,
    "recipientIds": [4],
    "readByIds": [],
    "subject": "Packing completed",
    "content": "Shipment #102 is ready for dispatch.",
    "priority": "NORMAL",
    "replyToMessageId": null,
    "createdAt": "2026-10-11T10:30:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid message data

#### 2. Get Inbox
- **Endpoint**: `GET /messages/inbox`
- **Access**: Authenticated users
- **Description**: Retrieve the inbox (received messages) for the authenticated user
- **Response** (200): Array of received messages
- **Error Responses**: None

#### 3. Get Outbox
- **Endpoint**: `GET /messages/outbox`
- **Access**: Authenticated users
- **Description**: Retrieve the outbox (sent messages) for the authenticated user
- **Response** (200): Array of sent messages
- **Error Responses**: None

#### 4. Get All Messages
- **Endpoint**: `GET /messages/all`
- **Access**: Authenticated users
- **Description**: Retrieve all messages (inbox and outbox) for the authenticated user
- **Response** (200): Combined array of messages
- **Error Responses**: None

#### 5. Get Unread Count
- **Endpoint**: `GET /messages/unread-count`
- **Access**: Authenticated users
- **Description**: Get the count of unread messages
- **Response** (200):
  ```json
  {
    "unreadCount": 3
  }
  ```

#### 6. Mark Message as Read
- **Endpoint**: `PATCH /messages/:id/read`
- **Access**: Authenticated users
- **Parameters**:
  - `id` (number): Message ID
- **Response** (200): Updated message with readByIds
- **Error Responses**:
  - **404**: Message not found

#### 7. Filter Messages
- **Endpoint**: `GET /messages/filter`
- **Access**: Authenticated users
- **Description**: Retrieve messages filtered by sender, priority, thread, or read status
- **Query Parameters**:
  - `senderId` (number, optional): Filter by sender user ID
  - `priority` (enum, optional): Filter by priority level (LOW, NORMAL, HIGH, URGENT)
  - `replyToMessageId` (number, optional): Filter by parent message ID. Pass 0 for top-level only
  - `isRead` (boolean, optional): true = read only, false = unread only
  - `box` (enum, optional): inbox, outbox, or all (default)
- **Response** (200): Array of filtered messages
- **Error Responses**: None

---

### Seasons
**Base URL**: `/seasons`  
**Role Requirements**: MANAGER/OWNER for modifications

#### 1. Preview Season Creation
- **Endpoint**: `POST /seasons/preview`
- **Access**: MANAGER/OWNER
- **Description**: Preview creation of a new season including full default category/share bootstrap data
- **Request Body**:
  ```json
  {
    "yearName": 2027
  }
  ```
- **Response** (200):
  ```json
  {
    "season": {
      "id": 0,
      "yearName": 2027,
      "isActive": false,
      "slug": "2027"
    },
    "defaultCategories": [...],
    "defaultShares": [...]
  }
  ```
- **Error Responses**:
  - **400**: Invalid input

#### 2. Create Season
- **Endpoint**: `POST /seasons`
- **Access**: MANAGER/OWNER
- **Description**: Create a new harvest season. Unique constraint: [yearName]
- **Request Body**:
  ```json
  {
    "yearName": 2026
  }
  ```
- **Response** (201):
  ```json
  {
    "id": 1,
    "yearName": 2026,
    "isActive": true,
    "slug": "2026",
    "createdAt": "2026-05-11T00:00:00Z",
    "updatedAt": "2026-05-11T00:00:00Z"
  }
  ```
- **Error Responses**:
  - **400**: Invalid input or duplicate year name

#### 3. Get All Seasons
- **Endpoint**: `GET /seasons`
- **Access**: Authenticated users
- **Description**: Retrieve all seasons
- **Response** (200): Array of season objects
- **Error Responses**: None

#### 4. Get Active Season
- **Endpoint**: `GET /seasons/active`
- **Access**: Authenticated users
- **Description**: Retrieve the currently active season
- **Response** (200): Active season object
- **Error Responses**:
  - **404**: Active season not found

#### 5. Get Single Season
- **Endpoint**: `GET /seasons/:idOrSlug`
- **Access**: Authenticated users
- **Parameters**:
  - `idOrSlug` (string): Numeric ID or slug
- **Response** (200): Season object
- **Error Responses**:
  - **404**: Season not found

#### 6. Set Active Season
- **Endpoint**: `PATCH /seasons/:id/set-active`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Season ID
- **Description**: Set a season as the currently active season (deactivates all others)
- **Response** (200): Updated season
- **Error Responses**:
  - **404**: Season not found

#### 7. Delete Season
- **Endpoint**: `DELETE /seasons/:id`
- **Access**: MANAGER/OWNER
- **Parameters**:
  - `id` (number): Season ID
- **Response** (200): Deletion confirmation
- **Error Responses**:
  - **404**: Season not found

---

### General
**Base URL**: `/` (Root)

#### 1. Health Check
- **Endpoint**: `GET /`
- **Access**: Authenticated active users
- **Description**: Health check endpoint. Application status verification
- **Response** (200):
  ```json
  {
    "message": "Application is running"
  }
  ```

---

## Data Models Summary

### Core Enums

#### Role
- `OWNER` - Full system access
- `MANAGER` - Most operations
- `WORKER` - Limited access

#### PitamStatus
- `WITH_PITAM` - With pitam (pit mark)
- `WITHOUT_PITAM` - Without pitam
- `MIXED` - Mix of both

#### Grade
- `א` through `ו` - Hebrew grades (A through F equivalent)

#### AssignmentType
- `GENERAL` - General assignment
- `TRADER` - Trader-specific assignment
- `CUSTOMER` - Customer-specific assignment

#### MovementType
- `HARVEST_IN` - Initial entry from field sorting
- `INTERNAL_TRANSFER` - Transfer between Trader <-> Customer
- `OWNERSHIP_TRANSFER` - Transfer between Trader <-> Trader
- `ASSIGNED` - Assigned from general pool to trader
- `PACKED_SHIPPED` - Physically shipped via shipment
- `SELF_PICKUP` - Physically collected by owner
- `WASTE` - Spoilage or damage
- `ADJUSTMENT` - Manual inventory correction

#### ShipmentStatus
- `PREPARING` - Not yet departed
- `SHIPPED` - Gone from warehouse
- `DELIVERED` - Reached customer
- `CANCELLED` - Reverted

#### BoxStatus
- `OPEN` - Editing allowed
- `CLOSED` - Packed and sealed
- `SHIPPED` - Dispatched

#### BoxType
- `SMALL`, `MEDIUM`, `LARGE`, `CUSTOM`

#### BoxOwnership
- `TRADER`, `CUSTOMER`, `SHARED`, `UNASSIGNED`, `CUSTOM`

#### ItemOwnership
- `TRADER`, `CUSTOMER`, `UNASSIGNED`, `CUSTOM`

#### Currency
- `ILS` - Israeli Shekel
- `USD` - US Dollar
- `EUR` - Euro

#### Priority (Messages)
- `LOW`, `NORMAL`, `HIGH`, `URGENT`

---

## Response Headers

All responses include:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (for authenticated endpoints)

## Error Handling

Standard error response format:
```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request"
}
```

Common HTTP Status Codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid JWT
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication & Authorization Flow

1. **Login**: `POST /auth/login` → Receive JWT token
2. **Use Token**: Include token in `Authorization: Bearer <token>` header
3. **Check Role**: System validates user role for each endpoint
4. **Active Status**: User must have `isActive = true`
5. **Logout**: `POST /auth/logout` (optional, JWT is stateless)

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs are positive integers
- Slugs are URL-friendly, unique identifiers
- Soft deletes use `isDeleted` flag (not permanently removed)
- Composite keys ensure data uniqueness within context
- Seasonal multi-tenancy: Most data is scoped to a season
- Role-based visibility: Workers see limited information compared to managers/owners

