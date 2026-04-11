import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"
import { cardSkins } from "../src/data/skins/index"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "card-skins"
const OUT_DIR = join(process.cwd(), "public", "images", "skins")

async function download() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  let total = 0

  for (const skin of cardSkins) {
    console.log(`\n[${skin.id}] 파일 목록 조회 중...`)

    // 스킨 폴더 내 파일/폴더 목록 조회
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(skin.id, { limit: 1000, offset: 0 })

    if (error) {
      console.error(`  [${skin.id}] 목록 조회 실패:`, error.message)
      continue
    }

    if (!files || files.length === 0) {
      console.log(`  [${skin.id}] 파일 없음`)
      continue
    }

    for (const file of files) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue

      // metadata가 없으면 폴더(하위 목록 재조회)
      if (!file.metadata) {
        const { data: subFiles, error: subError } = await supabase.storage
          .from(BUCKET)
          .list(`${skin.id}/${file.name}`, { limit: 1000, offset: 0 })

        if (subError || !subFiles) continue

        for (const subFile of subFiles) {
          if (!subFile.name || subFile.name === ".emptyFolderPlaceholder") continue

          const storagePath = `${skin.id}/${file.name}/${subFile.name}`
          const localPath = join(OUT_DIR, skin.id, file.name, subFile.name)
          await downloadFile(supabase, storagePath, localPath)
          total++
        }
      } else {
        // 루트 직접 파일 (예: back.png)
        const storagePath = `${skin.id}/${file.name}`
        const localPath = join(OUT_DIR, skin.id, file.name)
        await downloadFile(supabase, storagePath, localPath)
        total++
      }
    }
  }

  console.log(`\n완료! 총 ${total}개 파일 다운로드`)
}

async function downloadFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  storagePath: string,
  localPath: string
) {
  const dir = join(localPath, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error || !data) {
    console.error(`  다운로드 실패: ${storagePath} — ${error?.message}`)
    return
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  writeFileSync(localPath, buffer)
  console.log(`  ✓ ${storagePath}`)
}

download().catch(console.error)
