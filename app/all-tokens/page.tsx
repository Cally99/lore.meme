// app/all-tokens/page.tsx

import { Suspense } from "react"
import AllTokensClient from "./AllTokensClient"

export default function AllTokensPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AllTokensClient />
    </Suspense>
  )
}