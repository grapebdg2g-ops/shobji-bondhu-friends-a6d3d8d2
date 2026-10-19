# AI মডেল ও API কন্ট্রল সেন্টার + রোগ শনাক্তকরণে TorveAI

## লক্ষ্য
1. রোগ শনাক্তকরণ (disease detection) Kimi-এর বদলে TorveAI গেটওয়ে (`https://api.torveai.com/v1/chat/completions`, OpenAI-সামঞ্জস্যপূর্ণ) দিয়ে চালানো।
2. অ্যাডমিন প্যানেলে একটি "AI সেটিংস" পাতা, যেখান থেকে অ্যাপের প্রতিটি AI ফিচারের জন্য মডেল ও প্রোভাইডার বাছাই করা যাবে — কোড বদলানো ছাড়াই।

## নিরাপত্তা নীতি (গুরুত্বপূর্ণ)
- **API key কখনো ডাটাবেসে বা ব্রাউজারে রাখা হবে না।** Key-গুলো Lovable Cloud-এর নিরাপদ সিক্রেট স্টোরে (সার্ভার-সাইড env) থাকবে। ডাটাবেসে শুধু সিক্রেটের *নাম* (যেমন `TORVEAI_API_KEY`) থাকবে — সার্ভার চলার সময় নাম দেখে আসল key পড়বে।
- অ্যাডমিন প্যানেল শুধু `user_roles`-এ admin থাকলে খুলবে; সব পরিবর্তন `ai_model_settings` টেবিলে RLS-সুরক্ষিত RPC দিয়ে হবে।

## ডাটাবেস
নতুন টেবিল `ai_model_settings`:
- `feature_key` (text, PK) — যেমন `disease_detection`, `ai_chat`, `chat_suggestions`, `price_extraction`, `price_prediction`, `soil_analysis`, `transcribe`
- `provider` (text) — `torveai` | `gemini` | `lovable_gateway`
- `model` (text) — যেমন `claude-opus-5-5`
- `api_key_secret` (text) — সিক্রেটের নাম, যেমন `TORVEAI_API_KEY`
- `is_active` (bool), `updated_by`, `updated_at`
- RLS: সবাই পড়তে পারবে না — শুধু সার্ভার (service role) ও admin। লেখা শুধু admin RPC `update_ai_model_setting` দিয়ে (security definer + admin চেক)।
- প্রতিটি ফিচারের জন্য ডিফল্ট সারি সিড করা হবে (disease_detection → torveai/claude-opus-5-5)।

## সার্ভার কোড
- `src/lib/ai-settings.server.ts` — ফিচারের সেটিং পড়ে, সিক্রেটের নাম থেকে env key রিজলভ করে, provider অনুযায়ী OpenAI-সামঞ্জস্যপূর্ণ কল করে (TorveAI/Lovable gateway উভয়ই chat-completions; Gemini আলাদা ফরম্যাট)। সেটিং না পেলে বর্তমান ডিফল্টে ফলব্যাক — কিছু ভাঙবে না।
- `src/lib/disease.functions.ts` — Kimi কল বাদ; সেটিং থেকে provider/model/key নিয়ে কল। ডিফল্ট: TorveAI `claude-opus-5-5`।
- `src/lib/chat.functions.ts` — `chatWithAI` ও `suggestFollowUps` সেটিং-চালিত (TorveAI/Gemini দুটোই সাপোর্ট)।
- `src/lib/price-from-text.functions.ts`, `price-prediction.functions.ts`, `soil.functions.ts`, `transcribe.functions.ts` — একই রিজলভার দিয়ে সেটিং-চালিত।

## অ্যাডমিন UI
- নতুন পাতা `/admin/ai-models` ("AI সেটিংস"): প্রতিটি ফিচারের কার্ড — প্রোভাইডার ড্রপডাউন, মডেল নাম ইনপুট, সিক্রেট নাম ইনপুট, চালু/বন্ধ টগল, সেভ বোতাম।
- অ্যাডমিন সাইডবারে লিংক যোগ।

## সিক্রেট
- `TORVEAI_API_KEY` — ব্যবহারকারীর কাছ থেকে `update_secret` ফর্মে নেওয়া হবে (পরিকল্পনা অনুমোদনের পর)।

## যাচাই
- টাইপচেক + বিদ্যমান টেস্ট চালানো।
- Key পাওয়ার পর রোগ শনাক্তকরণের একটা লাইভ কল করে দেখা।
