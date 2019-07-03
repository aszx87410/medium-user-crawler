# Medium 使用者爬蟲

## 簡介

誤打誤撞找到了一個 API，用 GET 就能夠取得資料，十分方便：https://medium.com/_/api/users/f1fb3e40dc37/profile/stream

如果想看 userId 是什麼，在 medium profile 頁面後面加 `?format=json` 就可以了，例如說：https://medium.com/@hulitw?format=json

API 可以帶參數 `?source=followers&limit=25`，就能夠抓到 follower 的資料。而 response 裡面也會有分頁資料，會給你一個 `to`，把它帶進去 querys string 就可以抓到下一頁的資料。

## 爬蟲架構

因為想偷懶所以只寫了一個效能很低的爬蟲，把 Queue 的部分改一改應該就能開很多 worker 來爬，效能可以增進很多。

架構是這樣的，用 MySQL 當儲存使用者資料的地方也當 Queue，開兩個 Table：`Users` 跟 `Queue`：

### Users

| id     | userId    | username                      | name       | bio  | follower | fr   | mediumMemberAt     | createdAt      | isWriterProgramEnrolled |
|--------|-----------|-------------------------------|------------|------|----------|------|--------------------|----------------|-------------------------|
| 自增ID | 使用者 ID | 前面加上 @ 就是 profile 網址  | 使用者名稱 | 自介 | 追蹤人數 | 分類 | 成為付費會員的時間 | 加入會員的時間 |                         |

### Queues

| id     | userId    |
|--------|-----------|
| 自增ID | 使用者 ID |

簡單來說呢，queue 裡面存著需要處理的 userId，`app.js` 的功用就是每次從 queue 裡面拿一個 id 出來，抓取使用者資料，如果是中文用戶的話就寫進資料庫，並且把所有 followers 的 id 都 push 到 queue 裡面（如果不在 queue 裡也不在 Users 裡的話），所以這個 queue 會長滿快的。

只要自己隨便新增一兩個 userId 進 queue 就可以開始跑了。

由於我只有一個 worker 在跑，所以 queue 增長的速度遠大於處理的速度，跑一個晚上可以跑到十萬筆資料左右。

所以我後來又寫了一個 `getUsers.js`，功用跟上面雷同，差異是在不抓 followers，只抓 queue 裡面 userId 的資料並寫進資料庫，可以透過 `config.js` 簡單設定一些參數來避免 rate limit。

我自己的用法是把 app.js 跑一個晚上，累積一堆資料，然後用 getUsers.js 把 queue 消化完，再重複做個一兩次應該就差不多了。

## 技術細節

比較麻煩的部分是「判斷是否是中文寫作者」這塊，用兩個網路上找到的 regexp 簡單做了一下。原本沒有考慮日本的漢字導致抓了一大堆日本人進來，後來才把邏輯寫完整，讓爬蟲順利很多。

一開始只有判斷 bio 跟 name，後來發現這樣很不精準，於是透過 profile 的 API 抓了發表過的文章（或也有可能是回覆過、拍手過之類的），判斷文章標題跟副標題是不是中文。

詳情可參考 medium.js 裡的 isMandarinUser。

這程式可以改進的地方還很多，例如說速度的部分就是，但我原本就想說慢慢跑就好，就沒有去改了。判定中文用戶的方式也可以加強。

## 使用

在 MySQL 裡面新增 Table：

``` sql
CREATE TABLE `Users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(32) NOT NULL DEFAULT '',
  `username` varchar(64) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `bio` text,
  `follower` int(11) DEFAULT NULL,
  `fr` varchar(8) DEFAULT NULL,
  `mediumMemberAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `isWriterProgramEnrolled` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Queues` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

把 `config.example.js` 改名成 `config.js` 並填入相關參數：

| db                 | 資料庫相關參數                                                      |
|--------------------|---------------------------------------------------------------------|
| batchLimit         | 在用 getUsers.js 時一次要抓幾筆使用者資料                           |
| randomDelay        | 在用 getUsers.js 時每一次要隨機暫停多久毫秒，避免太頻繁發送 request |
| errorRateTolerance | 在用 getUsers.js 時如果 response 的錯誤率低於這個值就忽略錯誤       |
| delayWhenError     | 出錯時要暫停的毫秒數                                                |

接著 `npm run start` 就可以開始跑了。`npm run getUsers` 則可以跑只處理使用者資料的程式。


