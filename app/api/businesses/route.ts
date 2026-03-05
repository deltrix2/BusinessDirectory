import { NextResponse, NextRequest } from "next/server"
import { db } from '@/lib/database' // Імпортуємо наш клас

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 10
  const offset = (page - 1) * pageSize

  // ... (залиште весь код отримання параметрів searchParams як є) ...

  try {
    // ЗАМІСТЬ client.connect() і client.query() ми будемо використовувати db.execute або db.getMany
    // Але оскільки тут складний SQL, давайте залишимо динамічну збірку рядка,
    // але виконаємо його через db.execute
    
    // ... (код збирання whereClauses, joins і params залишити як є) ...

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
    const joinClause = [...new Set(joins)].join(" ") // Використовуємо Set, щоб видалити дублікати джойнів

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT b.data_id) as count FROM businesses b ${joinClause} ${where}`
    const countResult = await db.execute(countQuery, params) // Використовуємо наш db.execute
    const total = parseInt(countResult.rows[0]?.count || '0')

    // Get paginated results
    const query = `SELECT DISTINCT b.* FROM businesses b ${joinClause} ${where} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    const queryParams = [...params, pageSize, offset]
    const result = await db.execute(query, queryParams) // Використовуємо наш db.execute
    const businesses = result.rows

    // ВАЖЛИВО: await client.end() більше не потрібно, db сам керує пулом
    return NextResponse.json({ total, businesses })
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Database query failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
