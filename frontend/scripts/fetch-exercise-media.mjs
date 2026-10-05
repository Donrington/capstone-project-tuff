#!/usr/bin/env node
/**
 * Self-host the exercise-library clips generated via Artlist (Kling v3 Pro,
 * 1080p, 5s, 16:9, no audio). Downloads each clip into public/media/exercises/
 * and, if ffmpeg + ffprobe are on PATH, re-encodes it as a seamless loop
 * (last second crossfades into the first) plus a poster frame — same
 * pipeline as scripts/fetch-media.mjs for the auth clips.
 *
 * Usage: node scripts/fetch-exercise-media.mjs [slug...]
 *   with no slugs it refetches everything; name slugs to fetch only those,
 *   which is what you want after generating a few new clips.
 *
 * Clips already downloaded are simply re-downloaded, so it is safe to re-run
 * after adding new slugs to CLIPS.
 */
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { encodeLoop, extractPoster } from "./fetch-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "media", "exercises");
const exercisesPath = path.join(root, "data", "exercises.ts");

// slug -> Artlist generation fileUrl, in the order each clip was generated.
const CLIPS = {
  pushups: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__4/-t-e-x-t_-t-o_-v-i-d-e-o-27de0686-a738-4751-a107-ebf302887334.mp4?Expires=2106269001&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=xCMU9QTRpQ-zTdke7eo00~ZLkH~e~RKVync271T1VXuKKBqVb16e94s3KSNFxS-K5BilDPohn~r0MYIezD7R3jIILYCCpmd963gF822DiVHEiuSa-Ox3eyk9zm071Qq-fv~kFEyC7jD4umcNRY2xzWCUEwBqIxC2mhFO61juzlbPdfCeAdX9cMJkeD5TqEhlEVpLt4foNLaizYGPiPscBbjPF6b3S~RJ02-u~56IKbwdxVVxfF72No~kTRV2EfAOSpABgj~ZuTAyZdLi1rw~d1fVeb7pAy5Fm6CdRUVWM74RClj05w8WpcvztufH5yW1q9t2ztIDHym~7xYu1mHwmQ__",
  pullups: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__1/-t-e-x-t_-t-o_-v-i-d-e-o-14ea65c8-663c-4c8d-99de-4915c97bb691.mp4?Expires=2106269005&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=NP3R0Sx~IDBv~OKN~17EpOuTu9h4ZGomnNpAyxPNnjFa7ObHFK0x8rGIl20Y1wTowoiN28eNumJMLdAjmS0dg2NevdQDKccuGQxOoc2j4mjvKmw5Whp41fogAC0ryijl8XC4zlBeIX4M5zMtv5xGIm-aPWEXBdPZm2Faf7~R3dAZToGdCvVjBGhf9Y4nLWVAqqqYi7geR3ELIh74jK7EWfa0C33qRcV5OFIQedAWmTByc10ZYRpTwD0bFMFBnufdxmR5ErQgCDMBnfuirBKr6fmEeCjBSpwOR3ZFMtg8n64inAYintK4cwUdWbEn2l7frW3a4X-ZP8-EQUfZAKDWvw__",
  squats: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-523e74a5-c89c-4cb5-8165-633ef92ecfc4.mp4?Expires=2106269005&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Wz-jeCGUTsefSBxvn~IItW5kFKX2cZ-oX3w1qlVmFDnREuDCY4rALSaK7evNROHUn3UhXSpKAtzg-NPXN5w2k1FuDMLbHVaIvWKQUua9FpCQsRGlppfXOJkOldpS3X12E0eX4HGUWbQgT5n7NLsB2gdjTFYPIMt1luWBigOxGDh5v4-U~najNe4NAH3~Kk5fuHVTeWK3LWpRagKlDX0JaRWfRAv9lwvM7rXMS2-erxYvHZnOPWtTv7xo8vX7VCflO1hr6dd0Fy13uhPTaQ9BZ19EirUxOrapPZR1ppWU0qJHARHGmg~dk5HMV4CLQcJ1AwLiLEsiqhRTRLU5d17lPQ__",
  plank: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__6/-t-e-x-t_-t-o_-v-i-d-e-o-99b235d7-6a71-424e-8bfd-4b7998b2ea3e.mp4?Expires=2106269011&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=sZQHEMPiYvfSfspD6IkfJa9ejQtlINv0ZONMH5M4JbA8-U2uMvEOIdFaTgzafvIjNStkeuMEh2Nl6HE627n3lvfUsDQx9qPwaN3x11jXLtlTo5DcIBRII3CkCgHtlC5sVN7JKZkaEyBwxT9gVUzyeyHt7uy0pdQK~HOCFk1R~1qgoEQNV-Hig7Z86R7xJU56y9Flx~KMRal36WYaL6UVmUyKbCeMm42IAKXyBZrPEJCRt9SMrzmAmqUVbRWT4rk~SuN6znqoA90E~gNenP448~LaQOA~Vlnl-SvWEpovXwJIhASKrn1Y50OUCK~I8cWlT3rGxsdnevkEXPKFqS2joA__",
  "jumping-jacks": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__5/-t-e-x-t_-t-o_-v-i-d-e-o-9f47e5c5-19d4-42d4-95d0-15bac9843622.mp4?Expires=2106269009&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=kz8DsCTvhV6m8jE8q7OZvBcsQGqMQW61fVbRkZtSSPpPIhrn3abD1hCXW4E8NEn6clR7lrIUHSWG-O5nFXCq07hDzUe~4laYlfJATUXixh33FxM3CDON9W~txuQT7vO7UBrPUrwKsPnbdZBAnznGOQQwPLk7JK3FtCJuMje~BehkI8yYItPmZ2psZUJ-8renXaXOoi47PPVr30WvHAD0P8r7buJg4CRhQHWj-v9GU6CP3q8rqI0UpbXWJZ9IgNcF00rRqJpweH4ySWzxkb~BZa48kpphUNvICVgZC4lkMgGpwLh-Ebi4i7LsL8HWV6M1RQ5p1toN1DcsQ3fGWYnBPg__",
  burpees: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__9/-t-e-x-t_-t-o_-v-i-d-e-o-b2577d03-e95f-431a-a0f9-e5ef16579b8b.mp4?Expires=2106269003&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=thbM-AZ0Ttkm01N-hgIz2AHW~bsGgAd1cV-IxM0UeX9BIEAOb-F-jKLK4nFx0TmbkDEBbOd7Em7WxjUoYPJJH8aewgSasYr9Z~~n5pwy7FA1Z28rK1~g4sknUJbLemcdPuRs0bSzfC1kfBYWfbhx9ChuOvdXCL-yCLd5~4QqatSvKAjl7pF3U6jXtP~TR6ltWzqevtuoDpfUADQdHqrPBTp5fRgU8q0gk8O1LnbCSgAfYaJLzI8ir8NDdaEzexpUHuKeB6yi3L-vZTDdZdPYiFIPmVrkkSA9wwXFpZTUo39vZu75I-XUTudSzLozM7Zn6WPQhnT9~UGrgn2eBKt5~w__",
  lunges: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__10/-t-e-x-t_-t-o_-v-i-d-e-o-167c0c79-57ed-46b1-9343-bcd7679f8f38.mp4?Expires=2106269003&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=r~y3toeU8B-VpNVLB~-8JTR5TaYAjPt0NcJI~kW2V0qA9AA32h9Sz7I7cDSx0fRDDJYzReyHInFsdCVqExhqrkL0ps1Ea5qIeXsEBMrr4AASKt4P6yjfXZZ1PlJCnKn8TXz3lqMewP-UZIFCeUupOJmyjnSUq8O9idp8xrGQF9k9Nw~CFMeaEPy5VdXxOA5vwj~YbXBgKo6Hzq3pyegyzj-l8YzdX75Evu6zJS3HvULhq1GTHth2gwN76vvSQanWBtxAwU0yvTcHWsJBsBd1D6k4wcHy7ycQaQb1KVWK9dgZbOw~md75PP-SlKcd03mqvyBYoHifhQ5omJg89kR~lw__",
  "mountain-climbers": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__4/-t-e-x-t_-t-o_-v-i-d-e-o-454c26f4-5390-4606-8d60-89e548ebf7fe.mp4?Expires=2106269007&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Tl9yD6XffbZ6CPwN2T-4VblqImaMh-Mhu5EtZgQlOgeiWBVs4Ku132ppiGQ2A0NhXTBQ2ZFodts3jjf8WHTk58Vi2HXtnVwGY~P9~KjdsiIsioZticvQDX5zF33iA5VnbV5SQVtaS3Js6Qqmtw-yqKgRPchi4JL7O7BFGT2vaAg57EZK~h-n-mqT08B1xaJRM9gVyk14CzJCEcOvnhuQpiP0XXaNp4CZkwwaXfnCzp2sX-XRy~I9XGLhuX0LSLCiFuWyLKhcLrViJTWtVsCUIAHgWBoWQyLTiJwvJmF99N12Z7XinD~qflOu0CtGUgnkNdA2Eu8ElAVqirdU4N5X7g__",
  "glute-bridges": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-0471a62b-ea3a-4140-b533-a56a613d65ce.mp4?Expires=2106269007&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=oXFJ8BP79Ex-c8iXGOCeSk9NABqEHXfAYHOGociBcrgfj10a3Cz0MX36MU5vKACd2Sv7Iu~HatjJ1viD3hc3dXVIv9f3ep~5i5fXFf7OZGfu3t-V0-bOmLdVD7g3cnpN23GCOWN~7TNVCSdD-WNOiOjZ1I4uZa1q67LWfmqRSq~wwYoUADQUlqM1ogqB-vQdS3H6Iymz5W1iHtC1gEYC3gQFd9F4xq4QxpoKrb20TGhl3hPhtq4vy1umLkyn18ue3fpikyf9GH5sxGH8KCTQamKRg4VnKwCiqSYE3805~StPUrxkrSjejIamnHed8vUF4ksUvd1pSObIjC4-kIfC8A__",
  "hundred": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__1/-t-e-x-t_-t-o_-v-i-d-e-o-8e612ef9-faf0-4490-b38a-7fda4da08dcb.mp4?Expires=2106518730&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=FRwwxeTTEQ0kEXxnekKUFMNQ8RJQT-t4ce7EenNyVpEJ93j3qavI-ExE6m1QagPV5v-ACnvgL~adKldpYXA4hYhkLmuMyu4~Y3UWwjoOOl59gU73zwWEbn5PZPOnyXLWv46PsaHGY8EfkByDw7I6LY4vX~BuDmFzeBp2QqCZ1jd31i1uYZlfCv7mltoa1Hypyb94mMB6tb2drvbEYeniLqR6B904b4pcCLlRiXwlr0d8lSM0Fni1hHxAGH36pitKnXCr0HKGNDiuXs7epo~iDLf0~MSo7H6WHoGBkO45nH0Q3sU13WDLeTRhJQ-LZldlniPnFkQ~58fg80DN1MZ67g__",
  "roll-up": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__3/-t-e-x-t_-t-o_-v-i-d-e-o-752eaea4-86a7-46fc-8516-43d6c06cf21f.mp4?Expires=2106518736&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Bk0IUyAmqXoYQ5LtzjbM-2pJUpftuE5Gg47KZDoscvKXtkIia10feThaxP85fA7ZN-dzfuKN6XR8egsqK1twUYma47RI6hSs72wOGJOqjMre~VcirFKUtb2yLQBngJKsrpZ2FEEUMpqoFTdwlnrm2~bHYEXuxf9u4Gimz-mAiJGRUylE-mfza8KGUzrzG7gXOXIijzoE8cLFWv36L~cS1wYJyLt6cYesxraNy0d7PrKbmBbD295do0CV350kgGgqycUct3dQ0Z0SFSdYz9o~RrXfPyg1KOzdO~8Rr7zlYyw56ujLd3loE0Be1P2KH7yPSMuByTynsrLzF8ANL~dECQ__",
  "single-leg-circles": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__5/-t-e-x-t_-t-o_-v-i-d-e-o-1d236903-843d-46c7-8f27-05f3088dfa68.mp4?Expires=2106518744&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=scL6TJmeKL-yt3oPio0uaiHt5dCRilGmYZgfh6rnUifCgPodK76dXoxoQ9RxXGLv0giI8fYL77QKDSLEV3VvrTP992OcvzuQ3~Jt5EN9Ea-763N3CNSxWv-IzrEnvfzkFhxHCzK52Dpieqa3OY8STuWcbqrd6fw11yoleQWsV3OYOstWwWO7H3CA3NgI5~Zdp2dgKDeOBX3mg6V3BuEIOaSL6RZf9lcYd5tHMUWX6PBqcA-rCZSkBoyoD6xcsLbw01bsxseP5u-Z2kUJBBLm~yjhQd20jrBknNOKvdoDx0OrDYbnhB8dfQBlk1XngHCKmiZvNEWTdZoqvXqMwibGsA__",
  "rolling-like-a-ball": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__6/-t-e-x-t_-t-o_-v-i-d-e-o-f7c041ff-c00d-4272-a706-8536c5c4402a.mp4?Expires=2106518774&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=jQOvJQEGd4RTUISVqMKEvLDLDod3vkYiMbn2eCm1w0-0QDRaWT~YiSFs9UQRrs-~cqePjMB-2~S~21MKBeS2poubjH4QcF0ur-YyL9OhR8MFiqCMK5Yzx4zAO321-o~nj5lQGyPASKIfsA2~eciUWH7jeOGo8jJw8c6gwzJ1aDbM2dDeR8N3jrw7jmV2DUs80HBZ6ieYKDqniNAhw4HLYIlhGtOG64YAPgZ4DVs5oEJYhXvR-O1yBscfg4MYClWJHnKP3IpRGcGyavUlDtqvI6yXCYMsVPvswtGZK4mlUr3K0EQXoTDiiMJ9kflx39YBZrrhecySXMTJ0UD-2WzsHQ__",
  "single-leg-stretch": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__6/-t-e-x-t_-t-o_-v-i-d-e-o-9cf47e64-6da5-436c-86b4-7f75d75b4136.mp4?Expires=2106518742&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=GVUI3DsxvvEZdBgogR-EbojyrT~La5kdRVv5WNqZ~h9ix~ho5Wkl-FpzeTbfaoOnWiDhah9BJEAFueTLCKDBIjqH2aFwLn5pg7vxxEE4u56DmamuZrTx~NYIkpvRfHC8Cl~lJ~J-ALVkx8wcVTHV49wS4JbifrTcoMRPcVoSc-nxwRrbklVP8HIUPGimsDH3Ju3ca7jxcqd02myzTpkng7aEf4R95XUjgfOgOtBtX3iKLZs6Y52jChcPrjKjHraj~OGk8zGniLsa8VdouZ77jPnbE8gP0cwuITDNcAlNSHELQs1ZqWDo0l7XnRpM4t7~EuZu-muScRhsA3pVaiQCow__",
  "double-leg-stretch": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__8/-t-e-x-t_-t-o_-v-i-d-e-o-a305b61e-f540-4ac0-8a75-0868eeaf199d.mp4?Expires=2106518732&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Jqakr6dlB7O0TVdzCQbJgAGfEbYfkGEcwOajY0LHWllCW0Xi93a6eUWdE5hQkk74MP5Eax4cpiO2EG37EMm6qfyBu0YkcbLCkhYAyFm6HGnnMVAMImHdXpb-BOAD7LsdGGSpmNPbKZvFMSKfIYavdVv~fA4feAZIx-kUbXsPNjxBmdbGKL2n~RsgaJDZu7g6xynLO1YtrjmqUsuhG6NxStRRapINaoqJ9t3SYqDsQVjN1QTcBYEAuvJ3ITzTyXxPXJLEMsfouhDUv7FjoxrpJKLvo7r1D~O73F~YZe1ThQfXmBfC4I-lQ6QSAoaZXN~1AiU-3lW~VjXwHSKiEu5yiQ__",
  "criss-cross": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__10/-t-e-x-t_-t-o_-v-i-d-e-o-da52af3f-93a3-4e6a-960c-b0deef45e70a.mp4?Expires=2106518764&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=qYs8AkqbTdEm3nyb4xNhkZaa--glXVFnll8Mi36m1xpjkDjyDhQSd2UuVAg7fwb2KXchum5ntYl3pfSSRucCWWGWJddDbZ5uLxiusV9rWcDaXl-WqJRihPCVqacrFPVTO1o0k9VIFPnl9fBOVEagNw3kuxeRUP24Vk9kbVcc-sMBvJuEyjnEP1C-hTcK0V~KxUIJgK~cWwVrNOl-tDLq~ny2TZNp-v0mBqGOIGrB3wu-it9L3oHk5ZygyniirI6sJstvhoGhXBiL3wNxI87GoBZyHQ6UcDYfGNG1MWBbnE7iAYi36yDTxrZnXxiXEIUl-qI038~AyHKIrzhPZYLbyQ__",
  "spine-stretch-forward": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__5/-t-e-x-t_-t-o_-v-i-d-e-o-c03e1ea6-4b2d-459e-8848-fd9324b44f00.mp4?Expires=2106518799&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=I7VT3sZtLRTBqxah4pJbXusVwkkQwDU~gIC0oFmWcEeGXX21LYWA9jo5XX9lFRiTL7aYzr5GSvO1aHBwNcOjcjpC~mLP0YSnIRb1bbu0lk3Khk~R1t88P4uJoIJtqt4g-UFAEuhG6-RTFbHXJhtzlKeVKYl7y6Z3ScVR1CmlOji41qDgFuJU2JRwOjqEnoYGNg~5CG1A-96S8Eu318EJpIhLL3YJglLMQ2Ds77ZG-6qQARbz6rMQeGt0isQtqsyTx3MTS7Tyc82-5J0iRYHebQnUeeycg1tMFg~mvVgnAcMrv0HuAj2FaHlWIRVN6IBy-r~rKg32bvBk-HRghow~pA__",
  "saw": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__10/-t-e-x-t_-t-o_-v-i-d-e-o-01896c8b-fe6d-4bba-a080-7695d66473d6.mp4?Expires=2106518848&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=lyyMAFb-nQzwfWUHeiiMP9TYmhNo3xYr6eA38Kj8TxxtQVRQaBJnI6xh8fDPtnZkr4JCE5yVlLD8b3KmYYWhVDSYmk51My2GpNmPuHNUpe1Q3PZLhEboM0I-jm5ocl8HcIsNfx1vzCSDHQYaYdbk8NjZ03UmMry9MYffQZckzYH8pc81qlQYZ3NDk7Io28~9SP-NAsFFIv6VvC373xBiug01j24PLsZnYf--KqkU7OPw-syliXjBd0iyPxeX0o2Nz1A9yqNK4LQTgLqjHhR9-3K5GUedoWfa2Jr8rzzpLhAomqFV62MxpTnY5gdz7IHWuTZNBq7kOTWedEHsCGkFIg__",
  "swan": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__7/-t-e-x-t_-t-o_-v-i-d-e-o-5e2f07ad-1227-496f-bd7e-055b2f3deef6.mp4?Expires=2106518919&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=lfd~8c6EIWg4GsraejxCRLUy-qr30e33KXJv8B2Zq~ngJNoOLV3xTEIIK1y~dkAvexsqVYxw3040RO6Am6u7D~Ch~cH3snOERWJx6YlrLlKqWMeDg9jc-tqv71ZGDcnLlf5ELFlsZiyJAMWcKcwwPkaaPt97cIp0sSi2~M1qx7R0SOYldAHotvTdXWyMs0c4r4kxEkz07GPbVfwML3nLAb-oVFBpxgozt7O5HluYgYMqKQi7vzE0zEEuhjkB0Aw6cmxXjKihvEJLp~uP0UJkMSJD96VW2D9GK84b1YTooe8xvv1uaBLZ2MBXmQcAMB59TwTUVJYFv-koCrbjJlhfQw__",
  "side-kick-series": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__3/-t-e-x-t_-t-o_-v-i-d-e-o-4e1965ab-0338-4030-8c23-1e7cb75ef272.mp4?Expires=2106518859&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=YYqNn~xarms28F2hAcVG8g9ELQDxs4K8J2ndXfR-IDRLN4krdmjn9ldLB6WpQ18AF4IbUFv2rZVowsxR0GDaTnw7OOmCHyuxzLd6Q4IK8smIHBMAyeCoOcWi2W41DEdaey1sn~BfNV0AEY1l3BsHrLxiLDngAYyI6ElbfLy33~VgmKw5zipcQHw3~DhYgVFx5q08lTwkGLcfMJVw26jKljf-3RjJ1hESqa4K7ghox9TTyzTwDEQV8AooBpRhp5IhoucRXi8~Hje~voWQyZFMdoRFZbNojPFBcx-Y3nw-NvdZOjdQSgbscxx1msG1jBiroYjJntzooVyRtYK848~5Ng__",
  "swimming": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__9/-t-e-x-t_-t-o_-v-i-d-e-o-30377c87-60d0-4641-9c1c-41209a4f7f0b.mp4?Expires=2106518859&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Du06KpU796jdZA3bdhv9C20vFW7Yi0YnRo0efLERljeqFZ6mzQ5XJuzZ~JbpGhKh8S-hv1MfpU~z7j~L36a-kYk1B103B1c5DL8INEGumpQqphrVbdOvRNSbXaynuG-XN6YhvpnrgYou1co3NThVETXs9Rln08VEsQSKDUWGGvk3OAKv3r6mcoQJMOgtAn5UnKNBFypYq~if6mCU2-6xYxNvn-fRDrfOuooZtpXc~KT0JT3XxCWIlbZmBZG9IVEqDvQhkFYVSPtBhRWzfbQVk2yOdgTv~EL60oks3D9bD~3qGEpGw34D4jAxWDcCDNCBWLbaQyyohoLvN7tMBmMzTg__",
  "teaser": "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-94f1b73a-fa52-45a4-a059-56d92c5379fb.mp4?Expires=2106518863&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=qM4fm7Ol13RQTG9q0qPDFdLJ9Die7ZJ-e4RHoR3hBiBjunlEZjdMCw-88fcS1TWqPXMQJK1anoSaYPKnNM5EPZt9wfpoNTmRZ6FLoj-iOGvjevcbKrPt-AdgXOuiVeKviYWxZ1Qs~hJUiB2bWv7mla3DOqMPx80S52dKX4QlQLeClH4Orn3JTO3zd42B9M0HeZSu0cJEZ2l1tz-R7ZO~Cnaa0O~Ht9lNXUIrjd0WENmP7CXRmFnEAX25JikpAfXVC8P0I7LogzvhSqTk0urTpeoJFafE16TDVtO51UPlPvmmYwE7kyARyZZyb5cVUCAdRlfuo5b-jmzRRen0zPh7jg__",
};


// The prompts the Pilates clips in CLIPS were generated from, kept so any one
// of them can be regenerated to match. Settings are the same as the rest of the
// library: Kling v3 Pro, 1080p, 5 seconds, 16:9, no audio. To replace a clip,
// generate it again, paste the new fileUrl into CLIPS and run this script with
// that slug.
export const PILATES_PROMPTS = {
  hundred:
    "Fit woman on a mat in a bright minimal studio, lying on her back, knees in tabletop, head and shoulders curled up, arms long by her hips pumping in small fast beats, side view, soft daylight, no text",
  "roll-up":
    "Fit woman on a mat in a bright minimal studio, slowly rolling up one vertebra at a time from lying flat to sitting tall with arms reaching forward, legs straight, side view, soft daylight, no text",
  "single-leg-circles":
    "Fit woman lying on her back on a mat in a bright minimal studio, one leg pointed to the ceiling drawing a slow circle, the other leg long on the mat, hips still, high side view, soft daylight, no text",
  "rolling-like-a-ball":
    "Fit woman on a mat in a bright minimal studio, tucked into a tight ball holding her shins, balancing behind her tailbone and rolling smoothly back and up, side view, soft daylight, no text",
  "single-leg-stretch":
    "Fit woman on a mat in a bright minimal studio, head and shoulders curled up, pulling one knee to her chest while the other leg extends low, alternating smoothly, high side view, soft daylight, no text",
  "double-leg-stretch":
    "Fit woman on a mat in a bright minimal studio, curled up with knees to chest then reaching both arms overhead and both legs long, circling the arms back to the knees, side view, soft daylight, no text",
  "criss-cross":
    "Fit woman on a mat in a bright minimal studio, hands behind her head with elbows wide, rotating her chest towards the opposite bent knee while the other leg extends, slow and controlled, high angle, soft daylight, no text",
  "spine-stretch-forward":
    "Fit woman sitting tall on a mat in a bright minimal studio, legs straight and wide with flexed feet, arms reaching forward as she curls down over an imaginary ball and stacks back up, side view, soft daylight, no text",
  saw: "Fit woman sitting on a mat in a bright minimal studio, legs wide and straight, arms out to the sides, twisting and reaching one hand past the opposite foot, then rolling up, high angle, soft daylight, no text",
  swan: "Fit woman lying face down on a mat in a bright minimal studio, hands under her shoulders, lifting her chest into a smooth back extension and lowering again, side view, soft daylight, no text",
  "side-kick-series":
    "Fit woman lying on her side on a mat in a bright minimal studio, propped on her forearm, top leg at hip height swinging forward and back with still hips, side view, soft daylight, no text",
  swimming:
    "Fit woman lying face down on a mat in a bright minimal studio, arms and legs lifted and fluttering in small quick beats with opposite arm and leg, chest lifted, high side view, soft daylight, no text",
  teaser:
    "Fit woman on a mat in a bright minimal studio, rolling up into a V shape balance with straight legs at an angle and arms reaching along them, holding steady, side view, soft daylight, no text",
};

const available = (cmd) =>
  import("node:child_process").then(({ spawnSync }) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url.split("?")[0]}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await mkdir(outDir, { recursive: true });

  // Named slugs only, so adding one clip does not re-encode the other twenty-one.
  const only = process.argv.slice(2);
  const wanted = only.length
    ? Object.fromEntries(Object.entries(CLIPS).filter(([slug]) => only.includes(slug)))
    : CLIPS;
  for (const slug of only) {
    if (!(slug in CLIPS)) throw new Error(`No clip URL for "${slug}" in CLIPS.`);
  }

  const ffmpeg = (await available("ffmpeg")) && (await available("ffprobe"));
  if (!ffmpeg) {
    console.warn("ffmpeg not found — saving original clips as-is, no loop crossfade or poster extraction.");
  }

  for (const [slug, url] of Object.entries(wanted)) {
    const raw = path.join(outDir, `${slug}.raw.mp4`);
    const video = path.join(outDir, `${slug}.mp4`);
    const poster = path.join(outDir, `${slug}.jpg`);

    console.log(`Downloading ${slug}…`);
    await download(url, raw);

    if (ffmpeg) {
      encodeLoop(raw, video);
      extractPoster(video, poster);
      await rm(raw);
    } else {
      await rm(video, { force: true });
      await rename(raw, video);
    }
  }

  let source = await readFile(exercisesPath, "utf8");
  for (const slug of Object.keys(wanted)) {
    const pattern = new RegExp(`(slug: "${slug}",[\\s\\S]*?mistakes: \\[[\\s\\S]*?\\],)\\r?\\n(  \\},)`);
    source = source.replace(
      pattern,
      `$1\r\n    video: { src: "/media/exercises/${slug}.mp4", poster: "/media/exercises/${slug}.jpg" },\r\n$2`,
    );
  }
  await writeFile(exercisesPath, source);

  console.log("Done — clips are in public/media/exercises and data/exercises.ts now points at them.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
