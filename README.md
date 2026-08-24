# Smart Chores Tracker – Backend

Spring Boot tabanlı **Smart Chores Tracker** backend'i.

Bu proje; aynı evde / grupta bulunan kullanıcıların görev oluşturabilmesi, görevleri grup üyelerine atayabilmesi, tamamlayabilmesi ve ileride puan / badge gibi gamification özelliklerinin eklenebilmesi amacıyla geliştirilmiştir.

> Bu README mevcut backend durumunu, proje mimarisini, PostgreSQL kurulumunu, Postman test akışını, frontend entegrasyonunu ve geliştirilmesi kalan işleri açıklamak için hazırlanmıştır.

---

## 1. Kullanılan Teknolojiler

- **Java 21**
- **Spring Boot 4.1.0**
- **Spring Web**
- **Spring Security**
- **OAuth2 Resource Server / JWT**
- **Spring Data JPA**
- **Jakarta Validation**
- **PostgreSQL**
- **Lombok**
- **Maven**

---

## 2. Mevcut Backend Durumu

Şu anda temel backend altyapısı çalışır durumdadır.

### Tamamlanan ana özellikler

- Kullanıcı register işlemi
- Kullanıcı login işlemi
- JWT üretimi ve JWT ile korunan endpoint'ler
- Merkezi hata yönetimi (`GlobalExceptionHandler`)
- Group CRUD işlemleri
- Group Membership altyapısı
- `OWNER / ADMIN / MEMBER` rol yapısı
- Grup oluşturulduğunda oluşturan kullanıcının otomatik `OWNER` yapılması
- Gruba kullanıcı ekleme
- Grup üyelerini listeleme
- Chore oluşturma
- Grup içindeki chore'ları listeleme
- Tek bir chore detayını güvenli şekilde görüntüleme
- Chore'un yalnızca ilgili grubun üyesine atanabilmesi
- Grup bazlı authorization kontrolleri

---

# 3. Proje Mimarisi

Backend, mümkün olduğunca **feature/module bazlı modüler monolith** yapısında tutulmuştur.

Temel fikir:

- Auth işlemleri kendi paketinde kalır.
- Group işlemleri kendi paketinde kalır.
- Membership, group domain'inin altında tutulur.
- Chore bağımsız bir feature olarak tutulur.
- Gamification daha sonra ayrı bir modül olarak eklenebilir.

Yaklaşık package yapısı:

```text
src/main/java/com/capstone/choreapp
│
├── auth
│   ├── controller
│   ├── dto
│   ├── exception
│   └── service
│
├── user
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   └── repository
│
├── group
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   ├── mapper
│   ├── repository
│   ├── service
│   │
│   └── membership
│       ├── controller
│       ├── dto
│       ├── entity
│       ├── exception
│       ├── mapper
│       ├── repository
│       └── service
│
├── chore
│   ├── controller
│   ├── dto
│   ├── entity
│   ├── exception
│   ├── mapper
│   ├── repository
│   └── service
│
├── common
│   └── exception
│
├── config
├── security
│
└── ChoreappApplication
```

---

# 4. Katmanların Görevleri

## Controller

HTTP request'lerini karşılar.

Örnek:

```text
POST /api/groups
GET  /api/groups/{groupId}/chores
```

Controller'ın görevi business logic yazmak değil; request'i alıp ilgili service'e aktarmaktır.

---

## Service

Asıl iş kuralları burada tutulur.

Örneğin bir chore oluşturulurken:

1. Kullanıcının ilgili grupta yetkili olup olmadığı kontrol edilir.
2. Group bulunur.
3. Chore'u oluşturan User bulunur.
4. Atanan kullanıcı varsa gerçekten ilgili grubun üyesi olup olmadığı kontrol edilir.
5. Chore oluşturulur.
6. Repository üzerinden database'e kaydedilir.

---

## Repository

Database ile iletişim sağlar.

Spring Data JPA kullanıldığı için temel CRUD işlemleri hazır gelir.

Örneğin:

```java
findById(...)
save(...)
delete(...)
```

Ayrıca projeye özel sorgular tanımlanmıştır.

---

## Entity

PostgreSQL tablolarını temsil eder.

Ana entity'ler:

```text
User
Group
GroupMembership
Chore
```

---

## DTO

Frontend ile backend arasında taşınan request / response verileridir.

Entity'lerin doğrudan frontend'e gönderilmemesi için kullanılır.

Örnek:

```text
CreateGroupRequest
GroupResponse
CreateChoreRequest
ChoreResponse
```

---

## Mapper

Entity ve DTO dönüşümlerini yapar.

Örneğin:

```text
Group -> GroupResponse
GroupMembership -> GroupMemberResponse
Chore -> ChoreResponse
```

---

# 5. Entity İlişkileri

Genel ilişki:

```text
                    User
                  /  |   \
                 /   |    \
                /    |     \
               ▼     ▼      ▼
            Group  Membership  Chore
              ▲        │         │
              │        │         │
              └────────┘         │
                   │             │
                   └─────────────┘
```

Daha açık hali:

```text
User
 │
 │ owns
 ▼
Group
 │
 │ has
 ▼
GroupMembership
 │
 ├── User
 ├── Group
 └── Role

Group
 │
 │ has many
 ▼
Chore
 ├── createdBy -> User
 ├── assignedUser -> User (nullable)
 └── group -> Group
```

---

# 6. Group Membership Mantığı

`GroupMembership`, bir kullanıcının bir gruptaki üyeliğini ve rolünü temsil eder.

Alanlar yaklaşık olarak:

```text
id
user
group
role
joinedAt
```

Roller:

```text
OWNER
ADMIN
MEMBER
```

Aynı kullanıcı aynı gruba iki kez üye olamaz.

Database seviyesinde:

```text
user_id + group_id
```

kombinasyonu unique tutulmaktadır.

## Grup oluşturulduğunda

Akış:

```text
POST /api/groups
      ↓
JWT'den user id alınır
      ↓
Group oluşturulur
      ↓
Group kaydedilir
      ↓
GroupMembership oluşturulur
      ↓
role = OWNER
```

Yani grubu oluşturan kişi otomatik olarak grubun ilk üyesidir.

---

# 7. Authorization Mantığı

JWT'nin `subject (sub)` alanında **User ID** tutulmaktadır.

Bu nedenle authentication üzerinden:

```java
authentication.getName()
```

ile gelen değer kullanıcı id'sine dönüştürülmektedir.

Örnek:

```java
Long userId = Long.valueOf(authentication.getName());
```

Membership servisinde merkezi authorization metotları bulunmaktadır.

Mantık:

```text
requireMember()
→ OWNER / ADMIN / MEMBER geçebilir

requireManager()
→ OWNER / ADMIN geçebilir

requireOwner()
→ sadece OWNER geçebilir
```

Bu kontroller özellikle Chore modülünde tekrar kullanılmaktadır.

---

# 8. Database Yapısı

PostgreSQL içerisinde temel olarak şu tablolar oluşmaktadır:

```text
users
chore_groups
group_memberships
chores
```

> `Group` SQL tarafında özel kelimelerle çakışabileceği için tablo adı `chore_groups` olarak tutulmuştur.

Hibernate geliştirme aşamasında entity'lerden tabloları otomatik oluşturmaktadır:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Bu nedenle PostgreSQL'de tabloların elle oluşturulması gerekmez.

---

# 9. PostgreSQL Kurulumu

Arkadaş bilgisayarında PostgreSQL kuruluysa yalnızca boş bir database oluşturulması yeterlidir.

Önerilen database adı:

```text
choreapp
```

pgAdmin üzerinden:

```text
Servers
→ PostgreSQL
→ Databases
→ Create
→ Database
→ choreapp
```

Database oluşturulduktan sonra tabloları elle eklemeyin.

Backend ilk kez çalıştırıldığında Hibernate tabloları oluşturacaktır.

---

# 10. Environment Variables

`application.properties` içerisinde secret veya kişisel database şifresi tutulmamaktadır.

Beklenen environment variable'lar:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
```

Örnek lokal değerler:

```text
DB_URL=jdbc:postgresql://localhost:5432/choreapp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
```

`application.properties`:

```properties
spring.application.name=choreapp

spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=update

app.jwt.access-token-minutes=15
app.jwt.secret=${JWT_SECRET}

server.error.include-stacktrace=never
```

## IntelliJ üzerinden environment variable ekleme

```text
Run
→ Edit Configurations
→ ChoreappApplication
→ Environment variables
```

Buraya kendi PostgreSQL bilgileriniz girilmelidir.

---

# 11. Projeyi Çalıştırma

## IntelliJ ile

1. Proje clone edilir.
2. Maven dependency'lerinin yüklenmesi beklenir.
3. PostgreSQL içerisinde `choreapp` database'i oluşturulur.
4. Environment variable'lar girilir.
5. `ChoreappApplication` çalıştırılır.

Backend varsayılan olarak:

```text
http://localhost:8080
```

üzerinde çalışır.

---

## Maven Wrapper ile

Windows:

```bash
mvnw.cmd spring-boot:run
```

Git Bash:

```bash
./mvnw spring-boot:run
```

---

# 12. Postman ile Test

Önerilen test sırası aşağıdaki gibidir.

> Endpoint yolları mevcut controller yapısına göredir.

---

## 12.1 Register

```http
POST http://localhost:8080/api/auth/register
```

Örnek body:

```json
{
  "name": "Test User",
  "email": "test@test.com",
  "password": "Test123!"
}
```

---

## 12.2 Login

```http
POST http://localhost:8080/api/auth/login
```

Body:

```json
{
  "email": "test@test.com",
  "password": "Test123!"
}
```

Response içerisinde bir:

```text
accessToken
```

döner.

Bu token sonraki korumalı request'lerde kullanılmalıdır.

Postman:

```text
Authorization
→ Bearer Token
→ accessToken değerini yapıştır
```

`Bearer` kelimesini token alanına tekrar yazmayın.

---

# 13. Group Endpoint'leri

## Grup oluşturma

```http
POST /api/groups
```

Body:

```json
{
  "name": "Test Household",
  "description": "Example household"
}
```

Beklenen:

```text
201 Created
```

Grubu oluşturan kullanıcı otomatik olarak `OWNER` olur.

---

## Kullanıcının sahibi olduğu grupları listeleme

```http
GET /api/groups
```

---

## Grup detayı

```http
GET /api/groups/{groupId}
```

---

## Grup güncelleme

```http
PATCH /api/groups/{groupId}
```

Örnek:

```json
{
  "name": "Updated Household"
}
```

---

## Grup silme

```http
DELETE /api/groups/{groupId}
```

Beklenen:

```text
204 No Content
```

---

# 14. Membership Endpoint'leri

## Grup üyelerini listeleme

```http
GET /api/groups/{groupId}/members
```

Bu endpoint'e yalnızca ilgili grubun üyeleri erişebilir.

---

## Gruba kullanıcı ekleme

```http
POST /api/groups/{groupId}/members
```

Body:

```json
{
  "email": "member@example.com"
}
```

Şu an için kullanıcı doğrudan gruba eklenmektedir.

> Bu akış MVP seviyesindedir. Daha sonra invitation sistemi ile değiştirilmesi planlanmıştır.

Eklenen kullanıcı varsayılan olarak:

```text
MEMBER
```

rolü alır.

---

# 15. Chore Endpoint'leri

## Chore oluşturma

```http
POST /api/groups/{groupId}/chores
```

Bu işlem için kullanıcının `OWNER` veya `ADMIN` olması gerekmektedir.

Örnek body:

```json
{
  "title": "Clean the kitchen",
  "description": "Clean the counter and wash the dishes",
  "assignedUserId": 1,
  "points": 20,
  "dueDate": "2026-08-25T18:00:00Z"
}
```

Kurallar:

- `assignedUserId` zorunlu değildir.
- Atanan kullanıcı varsa ilgili grubun üyesi olmak zorundadır.
- `points` null gelirse `0` olarak tutulur.
- Yeni chore başlangıçta `PENDING` olur.

---

## Grup chore'larını listeleme

```http
GET /api/groups/{groupId}/chores
```

Grubun herhangi bir üyesi erişebilir.

---

## Tek chore detayını görüntüleme

```http
GET /api/groups/{groupId}/chores/{choreId}
```

Kontroller:

1. Kullanıcının ilgili grubun üyesi olması gerekir.
2. Chore gerçekten URL'deki group'a ait olmalıdır.

Bu sayede yalnızca chore id tahmin edilerek başka grubun task bilgilerine erişilemez.

---

# 16. Mevcut HTTP Response Mantığı

Temel olarak:

```text
POST create      → 201 Created
GET              → 200 OK
PATCH            → 200 OK
DELETE           → 204 No Content

Not found        → 404 Not Found
Unauthorized     → 401 Unauthorized
Forbidden        → 403 Forbidden
Conflict         → 409 Conflict
```

Hatalar `GlobalExceptionHandler` üzerinden ortak bir formatta döndürülmektedir.

---

# 17. Frontend ile Entegrasyon

React frontend backend'e HTTP request göndererek bağlanmalıdır.

Backend base URL:

```text
http://localhost:8080
```

Frontend tarafında örneğin:

```javascript
const API_URL = "http://localhost:8080";
```

tercihen `.env`:

```text
VITE_API_URL=http://localhost:8080
```

ve kullanım:

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

---

## Login sonrası token saklama

Login response'undan gelen:

```text
accessToken
```

frontend tarafında saklanmalı ve korumalı endpoint'lere gönderilmelidir.

Örnek header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Fetch örneği:

```javascript
fetch(`${API_URL}/api/groups`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Axios kullanılıyorsa ortak axios instance/interceptor kurulması önerilir.

---

# 18. Önerilen Frontend Akışı

```text
Register / Login Page
        ↓
JWT alınır
        ↓
Groups Page
        ↓
GET /api/groups
        ↓
Group Detail
        ↓
GET /api/groups/{id}/members
GET /api/groups/{id}/chores
        ↓
Create Chore
        ↓
POST /api/groups/{id}/chores
```

---

# 19. CORS

React ve Spring Boot farklı portlarda çalışacağı için frontend entegrasyonu sırasında CORS ayarı gerekebilir.

Örneğin frontend:

```text
http://localhost:5173
```

backend:

```text
http://localhost:8080
```

üzerinde çalışıyorsa Spring Security içerisinde frontend origin'inin izinli olması gerekebilir.

Eğer browser'da:

```text
CORS policy
```

hatası alınırsa Security/CORS configuration eklenmelidir.

Postman CORS uygulamadığı için Postman'de çalışan bir endpoint'in browser'da CORS nedeniyle engellenmesi mümkündür.

---

# 20. Ana Akışta Kalan Backend İşleri

## Chore

- [ ] Chore güncelleme endpoint'i
- [ ] Chore silme endpoint'i
- [ ] Chore tamamlama endpoint'i
- [ ] Completion sırasında `status = COMPLETED` yapılması
- [ ] Completion sırasında `completedAt` kaydedilmesi
- [ ] Chore tamamlama yetkisinin assigned user / manager bazında kontrol edilmesi
- [ ] Update sırasında yeni assigned user'ın group member olduğunun kontrol edilmesi
- [ ] Eksik Chore exception'larının `GlobalExceptionHandler` ile tamamlanması

Önerilen endpoint'ler:

```text
PATCH  /api/groups/{groupId}/chores/{choreId}
DELETE /api/groups/{groupId}/chores/{choreId}
PATCH  /api/groups/{groupId}/chores/{choreId}/complete
```

---

# 21. Gamification Tarafında Kalanlar

Gamification henüz uygulanmamıştır.

Chore entity içerisinde `points` alanı hazır tutulmaktadır.

Geliştirilecekler:

- [ ] Tamamlanan chore üzerinden puan kazanılması
- [ ] Kullanıcı toplam puanı
- [ ] Grup leaderboard
- [ ] Tamamlanan görev sayısı
- [ ] Badge / achievement sistemi
- [ ] Progress dashboard endpoint'leri

Önemli:

> Chore tamamlandığında direkt `User` entity'sinin içine rastgele puan logic'i gömmek yerine ayrı bir `gamification` service/module oluşturulması önerilir.

Örnek ilerideki akış:

```text
Chore completed
      ↓
GamificationService
      ↓
Points / Stats / Badge
```

---

# 22. Group / Membership Tarafında Kalan Ek İşler

- [ ] Invitation sistemi
- [ ] Invitation accept/reject
- [ ] Member çıkarma
- [ ] Kullanıcının gruptan ayrılması
- [ ] MEMBER → ADMIN rol değiştirme
- [ ] Ownership transfer
- [ ] Kullanıcının sadece owner olduğu değil, üyesi olduğu bütün grupların listelenmesi

Şu anda:

```http
GET /api/groups
```

kullanıcının **owner olduğu grupları** döndürmektedir.

Frontend için ileride kullanıcının üyesi olduğu tüm grupları getiren ayrı veya güncellenmiş bir endpoint gerekebilir.

---

# 23. MVP Sonrası Özellikler

- [ ] Recurring tasks
- [ ] Deadline yaklaşınca notification
- [ ] Yeni chore atanınca notification
- [ ] Activity/history feed
- [ ] User profile/statistics
- [ ] Completed chore history
- [ ] Overdue filtreleme
- [ ] Chore filtreleme ve sıralama

---

# 24. Teknik İyileştirmeler

- [ ] JWT access token süresi gözden geçirilebilir
- [ ] Refresh token sistemi eklenebilir
- [ ] Validation error response'ları standartlaştırılabilir
- [ ] Unit testler eklenebilir
- [ ] Integration testler eklenebilir
- [ ] Controller/service authorization testleri eklenebilir
- [ ] Swagger / OpenAPI eklenebilir
- [ ] Development ilerledikçe Hibernate `ddl-auto` yerine Flyway/Liquibase düşünülebilir
- [ ] Production için secret/config yönetimi iyileştirilebilir
- [ ] CORS config frontend origin'ine göre tamamlanabilir

---

# 25. Database Paylaşımı Hakkında

PostgreSQL database dosyasının kendisi GitHub'a yüklenmez.

Her geliştirici kendi bilgisayarında:

```text
choreapp
```

database'ini oluşturur.

Spring Boot çalıştırıldığında JPA/Hibernate entity'lerden tablolar oluşturulur.

Bu nedenle repoyu clone eden kişinin mevcut lokal verileri gelmez.

Örnek test kayıtları gerekiyorsa:

- Postman üzerinden oluşturulabilir
- İleride `data.sql` eklenebilir
- Gerekirse database dump kullanılabilir

Şimdilik ortak database dump gerekli değildir.

---

# 26. Yeni Bir Geliştirici İçin Önerilen İlk Test

Projeyi ilk kez açtıktan sonra:

```text
1. PostgreSQL'de choreapp database oluştur
2. Environment variable'ları gir
3. Backend'i çalıştır
4. Postman'den User A register et
5. User A login ol ve JWT al
6. User A ile group oluştur
7. User B register et
8. User A tokenıyla User B'yi gruba ekle
9. Group members endpoint'ini test et
10. User A ile User B'ye chore oluştur
11. Group chore list endpoint'ini test et
12. Chore detail endpoint'ini test et
```

Bu akış başarılıysa mevcut backend altyapısı doğru şekilde kurulmuş demektir.

---

# 27. Geliştirme Sırası Önerisi

Kalan backend için önerilen sıra:

```text
1. Chore Update
2. Chore Delete
3. Chore Complete
4. Frontend integration / CORS
5. Membership improvements
6. Gamification
7. Badges / progress
8. Recurring tasks
9. Notifications
10. Tests / Swagger / cleanup
```

---

# 28. Özet

Mevcut backend'in ana dependency akışı:

```text
Auth
 ↓
User
 ↓
Group
 ↓
GroupMembership
 ↓
Chore
 ↓
Gamification (next)
```

Chore modülü, authorization için doğrudan kendi içinde membership sorgusu yazmak yerine:

```text
GroupMembershipService
```

üzerindeki ortak permission metotlarını kullanacak şekilde tasarlanmıştır.

Bu yaklaşım korunursa kalan backend modüllerinin geliştirilmesi daha kolay olacaktır.
