import { useEffect, useState } from 'react'

import './App.css'

import {

  addFamilyMember,

  clearToken,

  createFamily,

  deleteDocument,

  downloadDocument,

  getDocumentOCR,

  getDocuments,

  getFamilies,

  getFamilyMembers,

  getProfile,

  getToken,

  login,

  registerUser,

  uploadDocument,

} from './api/client'

function formatDate(value) {

  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-IN', {

    day: '2-digit',

    month: 'short',

    year: 'numeric',

  })

}

function fileIcon(fileName = '') {

  const extension = fileName.split('.').pop()?.toLowerCase()

  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)) return '🖼️'

  if (extension === 'pdf') return '📕'

  return '📄'

}

function App() {

  const [token, setToken] = useState(getToken())

  const [profile, setProfile] = useState(null)

  const [authMode, setAuthMode] = useState('login')

  const [fullName, setFullName] = useState('')

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [familyId, setFamilyId] = useState('')

  const [families, setFamilies] = useState([])

  const [familyName, setFamilyName] = useState('')

  const [documents, setDocuments] = useState([])

  const [members, setMembers] = useState([])

  const [memberEmail, setMemberEmail] = useState('')

  const [memberRole, setMemberRole] = useState('member')

  const [membersLoading, setMembersLoading] = useState(false)

  const [activePage, setActivePage] = useState('Overview')

  const [search, setSearch] = useState('')

  const [selectedDocument, setSelectedDocument] = useState(null)

  const [ocr, setOcr] = useState(null)

  const [notice, setNotice] = useState('')

  const [busy, setBusy] = useState(false)

  async function loadDocuments(id = familyId) {

    if (!id) return

    const data = await getDocuments(id)

    setDocuments(data.map((doc) => ({

      ...doc,

      file: doc.file_name,

      date: formatDate(doc.created_at),

      status: 'Stored',

      icon: fileIcon(doc.file_name),

    })))

  }

  async function loadMembers(id = familyId) {

    if (!id) return

    setMembersLoading(true)

    try {

      const data = await getFamilyMembers(id)

      setMembers(Array.isArray(data) ? data : [])

    } catch (error) {

      setNotice(error.message)

    } finally {

      setMembersLoading(false)

    }

  }

  async function handleAddMember(event) {

    event.preventDefault()

    if (!familyId) {

      setNotice('Create a family workspace first.')

      return

    }

    setBusy(true)

    setNotice('')

    try {

      await addFamilyMember(Number(familyId), memberEmail.trim(), memberRole)

      setMemberEmail('')

      setMemberRole('member')

      await loadMembers()

      setNotice('Family member added successfully.')

    } catch (error) {

      setNotice(error.message)

    } finally {

      setBusy(false)

    }

  }

  async function loadSession() {

    try {

      const user = await getProfile()

      setProfile(user)

      setToken(getToken())

    } catch {

      clearToken()

      setToken(null)

      setProfile(null)

      setFamilyId('')

      return

    }

    try {

      const availableFamilies = await getFamilies()

      const safeFamilies = Array.isArray(availableFamilies) ? availableFamilies : []

      setFamilies(safeFamilies)

      if (safeFamilies.length > 0) {

        setFamilyId((currentId) => safeFamilies.some((family) => String(family.id) === currentId)

          ? currentId

          : String(safeFamilies[0].id))

      } else {

        setFamilyId('')

        setDocuments([])

        setMembers([])

      }

    } catch (error) {

      setNotice(error.message)

    }

  }

  useEffect(() => {

    if (token) loadSession()

  }, [])

  useEffect(() => {

    setDocuments([])

    setSelectedDocument(null)

    if (token && familyId) {

      loadDocuments(familyId).catch((error) => setNotice(error.message))

    }

  }, [token, familyId])

  useEffect(() => {

    setMembers([])

    if (token && familyId) {

      loadMembers(familyId)

    }

  }, [token, familyId])

  async function handleAuth(event) {

    event.preventDefault()

    setBusy(true)

    setNotice('')

    try {

      if (authMode === 'register') {

        await registerUser(fullName, email, password)

        setNotice('Account created. Please log in.')

        setAuthMode('login')

      } else {

        await login(email, password)

        setToken(getToken())

        const user = await getProfile()

        setProfile(user)

        const availableFamilies = await getFamilies()

        const safeFamilies = Array.isArray(availableFamilies) ? availableFamilies : []

        setFamilies(safeFamilies)

        setFamilyId(safeFamilies.length > 0 ? String(safeFamilies[0].id) : '')

        setDocuments([])

        setMembers([])

        setNotice('Welcome to FamilyVault.')

      }

    } catch (error) {

      setNotice(error.message)

    } finally {

      setBusy(false)

    }

  }

  async function handleCreateFamily(event) {

    event.preventDefault()

    setBusy(true)

    setNotice('')

    try {

      const family = await createFamily(familyName)

      const updatedFamilies = await getFamilies()

      setFamilies(Array.isArray(updatedFamilies) ? updatedFamilies : [family])

      setFamilyId(String(family.id))

      setDocuments([])

      setMembers([])

      setFamilyName('')

      setNotice(`Family "${family.name}" created successfully.`)

    } catch (error) {

      setNotice(error.message)

    } finally {

      setBusy(false)

    }

  }

  async function handleFileSelect(event) {

    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) return

    if (!familyId) {

      setNotice('Create a family workspace first, then upload your document.')

      return

    }

    setBusy(true)

    setNotice(`Uploading ${file.name}...`)

    try {

      const uploaded = await uploadDocument(Number(familyId), file)

      await loadDocuments()

      setSelectedDocument({

        ...uploaded,

        file: uploaded.file_name,

        date: formatDate(uploaded.created_at),

        status: 'Uploaded',

        icon: fileIcon(uploaded.file_name),

      })

      setOcr(null)

      setNotice(`${file.name} uploaded successfully.`)

    } catch (error) {

      setNotice(error.message)

    } finally {

      setBusy(false)

    }

  }

  async function openDocument(document) {

    setSelectedDocument(document)

    setOcr(null)

    setNotice('')

    try {

      const result = await getDocumentOCR(familyId, document.id)

      setOcr(result)

    } catch (error) {

      if (!error.message.includes('(404)')) setNotice(error.message)

      setOcr(null)

    }

  }

  async function handleDelete(document) {

    if (!window.confirm(`Delete "${document.file_name}" permanently?`)) return

    try {

      await deleteDocument(familyId, document.id)

      setDocuments((current) => current.filter((item) => item.id !== document.id))

      setSelectedDocument(null)

      setNotice('Document deleted.')

    } catch (error) {

      setNotice(error.message)

    }

  }

  async function handleDownload(document) {

    try {

      await downloadDocument(familyId, document.id)

    } catch (error) {

      setNotice(error.message)

    }

  }

  async function handleLogout() {

    clearToken()

    setToken(null)

    setProfile(null)

    setFamilyId('')

    setFamilies([])

    setDocuments([])

    setMembers([])

    setSelectedDocument(null)

    setOcr(null)

    setNotice('You have logged out.')

  }

  const filteredDocuments = documents.filter((document) =>

    `${document.name} ${document.file_name} ${document.category}`

      .toLowerCase()

      .includes(search.toLowerCase())

  )

  if (!token || !profile) {

    return (

      <div className="vault-app">

        <main className="main-content">

          <div className="page-content">

            <section className="panel" style={{ maxWidth: 460, margin: '60px auto', padding: 32 }}>

              <div className="brand" style={{ marginBottom: 28 }}>

                <div className="brand-mark">V</div>

                <div>

                  <h2>FamilyVault</h2>

                  <span>YOUR FAMILY, SECURED</span>

                </div>

              </div>

              <p className="eyebrow">SECURE FAMILY DOCUMENTS</p>

              <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>

              <p className="subtitle">

                {authMode === 'login'

                  ? 'Log in to access your family workspace.'

                  : 'Register to get started with FamilyVault.'}

              </p>

              <form onSubmit={handleAuth} style={{ display: 'grid', gap: 16, marginTop: 24 }}>

                {authMode === 'register' && (

                  <label>

                    Full name

                    <input

                      required

                      minLength={2}

                      maxLength={150}

                      value={fullName}

                      onChange={(event) => setFullName(event.target.value)}

                      placeholder="Your full name"

                      style={{ display: 'block', width: '100%', marginTop: 6, padding: 12 }}

                    />

                  </label>

                )}

                <label>

                  Email address

                  <input

                    type="email"

                    required

                    value={email}

                    onChange={(event) => setEmail(event.target.value)}

                    placeholder="you@example.com"

                    style={{ display: 'block', width: '100%', marginTop: 6, padding: 12 }}

                  />

                </label>

                <label>

                  Password

                  <input

                    type="password"

                    required

                    minLength={8}

                    maxLength={72}

                    value={password}

                    onChange={(event) => setPassword(event.target.value)}

                    placeholder="At least 8 characters"

                    style={{ display: 'block', width: '100%', marginTop: 6, padding: 12 }}

                  />

                </label>

                <button className="primary-button" type="submit" disabled={busy}>

                  {busy ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}

                </button>

              </form>

              {notice && <p className="notice" role="status">{notice}</p>}

              <p style={{ marginTop: 20 }}>

                {authMode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}

                <button

                  className="secondary-button"

                  type="button"

                  onClick={() => {

                    setAuthMode(authMode === 'login' ? 'register' : 'login')

                    setNotice('')

                  }}

                >

                  {authMode === 'login' ? 'Register' : 'Log in'}

                </button>

              </p>

            </section>

          </div>

        </main>

      </div>

    )

  }

  return (

    <div className="vault-app">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">V</div>

          <div><h2>FamilyVault</h2><span>YOUR FAMILY, SECURED</span></div>

        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">

          {[

            ['Overview', '▦'],

            ['Documents', '▤'],

            ['Family members', '♧'],

            ['Recently added', '◷'],

          ].map(([page, icon]) => (

            <button

              key={page}

              className={`nav-item ${activePage === page ? 'active' : ''}`}

              onClick={() => {

                setActivePage(page)

                setSelectedDocument(null)

              }}

            >

              <span className="nav-icon">{icon}</span>{page}

              {page === 'Documents' && <span className="nav-count">{documents.length}</span>}

            </button>

          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="security-card">

            <div className="security-icon">♧</div>

            <strong>Your files, protected</strong>

            <p>Private family document management in one place.</p>

          </div>

          <div className="profile">

            <div className="avatar">{profile.full_name?.[0]?.toUpperCase() || 'U'}</div>

            <div className="profile-details">

              <strong>{profile.full_name}</strong>

              <span>{profile.email}</span>

            </div>

            <button className="more-button" onClick={handleLogout} title="Log out">↪</button>

          </div>

        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">

            <span>Workspace</span><span className="breadcrumb-separator">/</span>

            <strong>{selectedDocument ? selectedDocument.name : activePage}</strong>

          </div>

          <div className="topbar-right">

            <span className="secure-label"><span className="status-dot" /> Secure workspace</span>

            <button className="help-button" onClick={() => setNotice('FamilyVault helps you organize, store, and read family documents.')}>? Help</button>

          </div>

        </header>

        <div className="page-content">

          {families.length > 0 && (

            <section className="panel" style={{ padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

              <label htmlFor="family-workspace-select" style={{ fontWeight: 600 }}>Family workspace</label>

              <select

                id="family-workspace-select"

                value={familyId}

                onChange={(event) => {

                  setFamilyId(event.target.value)

                  setSelectedDocument(null)

                  setOcr(null)

                  setSearch('')

                  setNotice('')

                }}

                style={{ minWidth: 220, maxWidth: '100%', padding: 10 }}

              >

                {families.map((family) => (

                  <option key={family.id} value={String(family.id)}>{family.name || `Family ${family.id}`}</option>

                ))}

              </select>

              <span className="subtitle" style={{ margin: 0 }}>Documents and members shown below belong to the selected family.</span>

            </section>

          )}

          {notice && (

            <div className="notice" role="status">

              <span>{notice}</span>

              <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>

            </div>

          )}

          {!familyId ? (

            <section className="panel" style={{ maxWidth: 650, margin: '40px auto', padding: 28 }}>

              <p className="eyebrow">GET STARTED</p>

              <h1>Create your family workspace</h1>

              <p className="subtitle">Your documents belong to a family workspace. Create one to begin uploading files.</p>

              <form onSubmit={handleCreateFamily} style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>

                <input

                  required

                  minLength={2}

                  maxLength={150}

                  value={familyName}

                  onChange={(event) => setFamilyName(event.target.value)}

                  placeholder="e.g. Our Family"

                  style={{ flex: 1, minWidth: 200, padding: 12 }}

                />

                <button className="primary-button" disabled={busy}>

                  {busy ? 'Creating...' : 'Create family'}

                </button>

              </form>

            </section>

          ) : selectedDocument ? (

            <section className="document-detail">

              <button className="back-button" onClick={() => setSelectedDocument(null)}>← Back to documents</button>

              <div className="page-heading">

                <div>

                  <p className="eyebrow">DOCUMENT DETAILS</p>

                  <h1>{selectedDocument.name}</h1>

                  <p className="subtitle">{selectedDocument.file_name}</p>

                </div>

                <span className="document-icon-large">{selectedDocument.icon}</span>

              </div>

              <div className="detail-grid">

                <section className="panel">

                  <h3>Document information</h3>

                  <div className="info-row"><span>Category</span><strong>{selectedDocument.category}</strong></div>

                  <div className="info-row"><span>Date added</span><strong>{formatDate(selectedDocument.created_at)}</strong></div>

                  <div className="info-row"><span>File type</span><strong>{selectedDocument.file_type}</strong></div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>

                    <button className="primary-button" onClick={() => handleDownload(selectedDocument)}>Download</button>

                    <button className="secondary-button" onClick={() => handleDelete(selectedDocument)}>Delete</button>

                  </div>

                </section>

                <section className="panel">

                  <h3>Extracted text (OCR)</h3>

                  {ocr ? (

                    <>

                      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ocr.extracted_text}</p>

                      <p className="subtitle">Language: {ocr.language || 'Unknown'} · Confidence: {ocr.confidence == null ? '—' : `${(ocr.confidence * 100).toFixed(2)}%`}</p>

                    </>

                  ) : (

                    <p className="empty-state">No OCR result is available for this file yet. OCR is automatically attempted for supported image files.</p>

                  )}

                  <button className="secondary-button" onClick={() => openDocument(selectedDocument)}>Refresh OCR result</button>

                </section>

              </div>

            </section>

           ) : activePage === 'Family members' ? (

            <section className="documents-section">

              <div className="section-heading">

                <div>

                  <p className="eyebrow">FAMILY WORKSPACE</p>

                  <h1>Family members</h1>

                  <p className="subtitle">Manage the people who belong to your family workspace.</p>

                </div>

                <button

                  className="secondary-button"

                  type="button"

                  onClick={() => loadMembers()}

                  disabled={membersLoading}

                >

                  {membersLoading ? 'Loading...' : 'Refresh ↻'}

                </button>

              </div>

              <section className="stats-grid">

                <div className="stat-card">

                  <div className="stat-icon amber">♧</div>

                  <span className="stat-label">Total family members</span>

                  <strong>{members.length}</strong>

                  <small>Including your owner membership</small>

                </div>

              </section>

              <section className="panel" style={{ padding: 24, marginBottom: 24 }}>

                <h2>Add a family member</h2>

                <p className="subtitle">

                  The person must already have a FamilyVault account. Only family owners and admins can add members.

                </p>

                <form onSubmit={handleAddMember} style={{ display: 'grid', gap: 14, maxWidth: 520, marginTop: 20 }}>

                  <label>

                    Registered email address

                    <input

                      type="email"

                      required

                      value={memberEmail}

                      onChange={(event) => setMemberEmail(event.target.value)}

                      placeholder="member@example.com"

                      style={{ display: 'block', width: '100%', marginTop: 6, padding: 12 }}

                    />

                  </label>

                  <label>

                    Role

                    <select

                      value={memberRole}

                      onChange={(event) => setMemberRole(event.target.value)}

                      style={{ display: 'block', width: '100%', marginTop: 6, padding: 12 }}

                    >

                      <option value="member">Member</option>

                      <option value="admin">Admin</option>

                      <option value="viewer">Viewer</option>

                    </select>

                  </label>

                  <div>

                    <button className="primary-button" type="submit" disabled={busy}>

                      {busy ? 'Adding...' : 'Add member'}

                    </button>

                  </div>

                </form>

              </section>

              <section className="panel" style={{ padding: 24 }}>

                <h2>Current members</h2>

                {membersLoading ? (

                  <p>Loading family members...</p>

                ) : members.length === 0 ? (

                  <p className="empty-state">No family members found.</p>

                ) : (

                  <div style={{ overflowX: 'auto', marginTop: 16 }}>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>

                      <thead>

                        <tr>

                          <th style={{ textAlign: 'left', padding: 12 }}>Name</th>

                          <th style={{ textAlign: 'left', padding: 12 }}>Email</th>

                          <th style={{ textAlign: 'left', padding: 12 }}>Role</th>

                          <th style={{ textAlign: 'left', padding: 12 }}>Joined</th>

                        </tr>

                      </thead>

                      <tbody>

                        {members.map((member) => (

                          <tr key={member.id}>

                            <td style={{ padding: 12, fontWeight: 600 }}>
                              {member.full_name || 'Name unavailable'}
                            </td>

                            <td style={{ padding: 12 }}>{member.email || '—'}</td>

                            <td style={{ padding: 12 }}>

                              <span className="status-pill stored">{member.role}</span>

                            </td>

                            <td style={{ padding: 12 }}>{formatDate(member.joined_at)}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </section>

            </section>

          ) : (

            <>

              <div className="welcome-row">

                <div>

                  <p className="eyebrow">FAMILY DOCUMENT MANAGEMENT</p>

                  <h1>{activePage === 'Overview' ? `Welcome, ${profile.full_name?.split(' ')[0] || 'back'}` : activePage}</h1>

                  <p className="subtitle">Everything important to your family, organized in one secure place.</p>

                </div>

                <label className="primary-button upload-button">

                  <span>＋</span> {busy ? 'Uploading...' : 'Add document'}

                  <input type="file" hidden disabled={busy} onChange={handleFileSelect} />

                </label>

              </div>

              {activePage === 'Overview' && (

                <section className="welcome-banner">

                  <div className="banner-copy">

                    <span className="banner-tag">YOUR FAMILY HUB</span>

                    <h2>Important documents.<br />Always within reach.</h2>

                    <p>Keep your certificates, identity records and family files together.</p>

                    <button className="banner-button" onClick={() => setActivePage('Documents')}>Explore documents <span>→</span></button>

                  </div>

                  <div className="banner-art" aria-hidden="true">

                    <div className="art-circle art-circle-back" />

                    <div className="art-folder">

                      <div className="art-paper paper-one">ID CARD</div>

                      <div className="art-paper paper-two">CERTIFICATE</div>

                      <div className="art-paper paper-three">FAMILY FILE</div>

                    </div>

                    <div className="art-shield">✓</div>

                  </div>

                </section>

              )}

              <section className="stats-grid">

                <div className="stat-card">

                  <div className="stat-icon purple">▤</div>

                  <span className="stat-label">Total documents</span>

                  <strong>{documents.length}</strong><small>Stored in your family workspace</small>

                </div>

                <div className="stat-card">

                  <div className="stat-icon green">✓</div>

                  <span className="stat-label">OCR available</span>

                  <strong>—</strong><small>Check individual document details</small>

                </div>

                <div className="stat-card">

                  <div className="stat-icon amber">♧</div>

                  <span className="stat-label">Family members</span>

                  <strong>{members.length}</strong><small>Members in your family workspace</small>

                </div>

              </section>

              <section className="documents-section">

                <div className="section-heading">

                  <div>

                    <h2>{activePage === 'Recently added' ? 'Recently added' : 'Your documents'}</h2>

                    <p>Find and manage your family files.</p>

                  </div>

                  <div className="document-tools">

                    <label className="search-box">

                      <span>⌕</span>

                      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents..." />

                    </label>

                    <button className="secondary-button" onClick={() => loadDocuments().catch((error) => setNotice(error.message))}>Refresh ↻</button>

                  </div>

                </div>

                <div className="document-table">

                  <div className="table-header">

                    <span>DOCUMENT</span><span>CATEGORY</span><span>DATE ADDED</span><span>STATUS</span><span />

                  </div>

                  {filteredDocuments.length === 0 ? (

                    <div className="empty-table">

                      <span>▤</span><strong>No documents found</strong>

                      <p>Upload a document or try another search.</p>

                    </div>

                  ) : filteredDocuments

                    .filter((doc) => activePage !== 'Recently added' || true)

                    .map((document) => (

                      <div className="table-row" key={document.id}>

                        <button className="file-cell" onClick={() => openDocument(document)}>

                          <span className="file-icon">{document.icon}</span>

                          <span className="file-info"><strong>{document.name}</strong><small>{document.file_name}</small></span>

                        </button>

                        <span className="category-cell">{document.category}</span>

                        <span className="date-cell">{formatDate(document.created_at)}</span>

                        <span><span className="status-pill stored"><span /> Stored</span></span>

                        <button className="more-button" title="View document" onClick={() => openDocument(document)}>···</button>

                      </div>

                    ))}

                </div>

                <p className="table-footnote">Connected to your FamilyVault backend.</p>

              </section>

            </>

          )}

          <footer className="footer">

            <span>© 2026 FamilyVault</span>

            <span><span className="status-dot" /> Designed for your family's privacy</span>

          </footer>

        </div>

      </main>

    </div>

  )

}

export default App