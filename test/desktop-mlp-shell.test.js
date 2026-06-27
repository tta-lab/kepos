import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop React shell separates navigation, workspace, and context panels', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='appRail'/)
  assert.match(source, /className='workspace'/)
  assert.match(source, /className='contextPanel'/)
  assert.equal(
    source.indexOf("className='appRail'") < source.indexOf("className='workspace'"),
    true
  )
  assert.equal(
    source.indexOf("className='workspace'") < source.indexOf("className='contextPanel'"),
    true
  )
  assert.equal(source.indexOf("id='lobbyForm'") > source.indexOf("className='contextPanel'"), true)
  assert.match(styles, /grid-template-columns:\s*88px minmax\(0, 1fr\) 340px/)
})
