// @ts-nocheck

/** Firebase project khayalami-app — shared with mobile google-services.json */
export const FCM_PROJECT_ID = "khayalami-app";

/** Always on — no env toggle */
export const FCM_ENABLED = true;

/** Android notification channel (matches APK AndroidManifest) */
export const FCM_ANDROID_CHANNEL = "khayalami_messages_bg";
export const FCM_ANDROID_ICON = "ic_stat_notification";
export const FCM_ANDROID_SOUND = "notification_chime";

/**
 * Firebase Admin service account — hardcoded for deploy-only workflow.
 * No external JSON file or env vars required on the server.
 */
export const FIREBASE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "khayalami-app",
  private_key_id: "3885e736676884b13816bcbe73829447aeca39b4",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCdzxGmFIoA8Fys\nskXPb47PTH7dNLhdd5tZr9QhSeUwQbwmV7HOj+MZWnJshO77AGLvgOggV/XVAuhs\nvyvnuTrXAf+JHCb1IBXHhftOQr/ZDAC+NncWZAL5+zkT5nEZGFnAwH5OhoCeWWRV\nPqIuAwq+XgXmCYdvu6pQDgYD5J2fh7lHqEv7yeI0a8QfHY2IwIcPIa4P9WDCDLW3\n6sSsilBDETAw2HcXefLJBHZdwIE0bffxX2RxYGz2hP4ubdjkqbc4C5k9K69EJRSa\nv0q170Qvy7QnZjo27zDHXjTILtOnIvRRyqDef4YOvxigqt4SMnFIYuy824aTA/b8\nBN54OtSzAgMBAAECggEAQtzCvgryw94TbgpkoLTEHdnr4J6fRN7SAAiLCQWtqSoY\n5Wf/iqUVVB8p3wfd15R81rxX3ahXHMcMIlNHb3lgUEvk8LtwWCidgbmnViva7EP1\nJqKeB2sdhbwnHWLkZX0XPh9xBKVhZnY6mBGfFn6sdScSObqs2y74xM2ER+77x+TH\nxwfozmWdLVQiqQXy5Hgx/6DXaOicZhw990clUjbk7v4fxyLgpeYvo3BlcCk3BmEP\nZ1YtrNXrIDFTZzZMfGeCDt3O2/HW+TJUm/TPRYqW9G8v0L8g/G3oN0+zoTvRFen9\n9aBk07GTz9QAeob2XpNauww0N6/I/TL0va8kyWBl9QKBgQDMk12TH3L9PD9TDOAB\nnFmNJ4rEfZCUwXulvfSqJtL2z+KMXPKU7vr5K/ldStDSfeUoPi06DeIi/qXxqVB6\n8V0Mwoh91iO9N9geZlGejKiLfXrFOtr4lfJp31JzawlZewmXMAxFH45HfmqrNTPK\nLtDx7DdSp9/7IYPUUe6I8h8z9wKBgQDFejeTLGyxaj4UGetPaZ/En2hYRFsYYN3g\nugv3bg/TpSHmnYeZN10jtBnMp1uvqDrO0gsZJMN58xwixnlPc3Q2fmtYtr1/3+Dy\n64gBcl+mmm1miYmHumWn2Uzb1oZpayB6TQoPNJxPfdLTy+VoRxm9cJnkKTNjwQJd\nYH6OIFG+JQKBgDn15qUwW9vznd1h4HWUXqrncSGKkdQTnXyv/QnYRh03ePBbxT79\nFo5SLyyHbfK1SJ/GPfocxN01WL7HQc4TZFGhLBq6+RU7JTg3tRg+seITgx0uN6wG\nj8//PdUFlniLq4PyUQekkSMgZghr4mh+KyTf0CzS81qrfDZDoFmcf8qxAoGAboNK\n/q3p1g+i1hT7PuHZa2vaNStr32S2RsFXWQzbBpJvOmQGMpRtJ0Hu/jzabp8y6fNa\nCqQsUN7gbAWudewiqSxuXqNFwX5EoS12W3jqVo4tkyh9Mtv5b8mH3a9cYTp2Xnsm\nmgPTRhkgFy8QHx9LJF0TgkAcZkLpU+BgcqFbnZECgYBymDDfHZ+H34NjtyB7DyMW\n1xjbltKovcqBJ6c/zkExMAIuNIk1fk0WkvXBqoESPTG3TiPV69Fw7rIsgC4qxx8W\nOX6Ka0tlbsggvolSTDLlwwaESKNW3OE9eA44ce4gaGSvjvZQR+07gurxDPAcLoVg\nIchuPIcnwUIzjj0T/3ZkMA==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@khayalami-app.iam.gserviceaccount.com",
  client_id: "110585490056387016686",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40khayalami-app.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};
