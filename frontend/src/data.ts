export type Article = {
  id: string
  title: string
  summary: string
  category: string
  source: string
  time: string
  image: string
  read: string
  featured?: boolean
}

export type Highlight = {
  id: string
  name: string
  handle: string
  caption: string
  image: string
  mediaUrl?: string
  publishedMediaUrl?: string
  likes: number
  time: string
  type: 'photo' | 'video'
  status: 'published' | 'pending' | 'rejected'
}

export const photos = {
  campus: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1500&q=85',
  students: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=82',
  lab: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=82',
  city: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=82',
  tech: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=82',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=82',
  library: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=82',
  event: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=82',
}

export const categories = ['All', 'India', 'Telangana', 'Hyderabad', 'Education', 'Technology', 'AI', 'Science', 'Business', 'Sports', 'Entertainment', 'World', 'Jobs']

export const articles: Article[] = [
  { id: 'n1', title: 'India’s next tech wave is being built far beyond its biggest metros', summary: 'A new generation of campuses and founders is redrawing the country’s innovation map.', category: 'Technology', source: 'The Daily Brief', time: '12 min ago', image: photos.tech, read: '4 min read', featured: true },
  { id: 'n2', title: 'Hyderabad expands its clean-mobility network with 40 new electric buses', summary: 'The city’s latest transport plan adds new routes connecting fast-growing neighbourhoods.', category: 'Hyderabad', source: 'City Desk', time: '38 min ago', image: photos.city, read: '3 min read' },
  { id: 'n3', title: 'Research teams turn agricultural waste into a lower-cost battery material', summary: 'The early-stage process could help make energy storage more affordable and local.', category: 'Science', source: 'Science Today', time: '1 hr ago', image: photos.lab, read: '5 min read' },
  { id: 'n4', title: 'New graduate hiring outlook points to a stronger second half', summary: 'Technology and financial services firms are among the sectors adding entry-level roles.', category: 'Jobs', source: 'Market Journal', time: '2 hrs ago', image: photos.students, read: '4 min read' },
  { id: 'n5', title: 'AI tools are changing how students study, but not what makes learning stick', summary: 'Educators are pairing new assistants with old-fashioned curiosity and peer discussion.', category: 'AI', source: 'The Daily Brief', time: '3 hrs ago', image: photos.library, read: '6 min read' },
  { id: 'n6', title: 'India’s women’s team secures a landmark win in the opening series', summary: 'A composed final quarter gave the visitors their first series lead in three years.', category: 'Sports', source: 'Ground Report', time: '4 hrs ago', image: photos.sports, read: '3 min read' },
  { id: 'n7', title: 'India expands student research grants for emerging technology projects', summary: 'The new demo brief highlights funding pathways for campus-led science and engineering teams.', category: 'India', source: 'Demo Brief', time: '5 hrs ago', image: photos.students, read: '3 min read' },
  { id: 'n8', title: 'Telangana universities join a statewide digital-skills programme', summary: 'Participating colleges will host short courses in data literacy and responsible computing.', category: 'Telangana', source: 'Demo Brief', time: '6 hrs ago', image: photos.library, read: '4 min read' },
  { id: 'n9', title: 'Campus mentors test a peer-led study programme before exam season', summary: 'Student volunteers are pairing first-year learners with senior subject mentors.', category: 'Education', source: 'Demo Brief', time: '7 hrs ago', image: photos.campus, read: '3 min read' },
  { id: 'n10', title: 'Small businesses look to digital payments for their next growth phase', summary: 'Local founders say simpler online tools are helping them reach new customers.', category: 'Business', source: 'Demo Brief', time: '8 hrs ago', image: photos.city, read: '4 min read' },
  { id: 'n11', title: 'Student filmmakers bring short documentaries to the campus screen', summary: 'The programme features new work from media clubs and independent creators.', category: 'Entertainment', source: 'Demo Brief', time: '9 hrs ago', image: photos.event, read: '2 min read' },
  { id: 'n12', title: 'Universities across the world share an open climate-research archive', summary: 'The international project makes datasets easier for student researchers to explore.', category: 'World', source: 'Demo Brief', time: '10 hrs ago', image: photos.lab, read: '5 min read' },
]

export const campusStories: Article[] = [
  { id: 'k1', title: 'KIET’s annual innovation showcase puts 120 student projects in the spotlight', summary: 'The two-day expo brought together student teams, alumni founders and industry mentors.', category: 'Events', source: 'Campus Desk', time: 'Today · 10:24 AM', image: photos.event, read: '4 min read', featured: true },
  { id: 'k2', title: 'CSE team earns a place in the national student hackathon final', summary: 'Team ByteForge advanced from a field of 800 entries with its accessible-learning prototype.', category: 'Achievements', source: 'Student Affairs', time: 'Yesterday', image: photos.lab, read: '3 min read' },
  { id: 'k3', title: 'Career week connects graduating students with 34 recruiting partners', summary: 'Workshops, portfolio reviews and interview sessions run through Friday on campus.', category: 'Placements', source: 'Training & Placement Cell', time: 'Sep 26', image: photos.students, read: '2 min read' },
]

export const initialHighlights: Highlight[] = [
  { id: 'p1', name: 'Ananya Rao', handle: '@ananyarao', caption: 'A little sunlight between lectures ☀️ #KIETCampus', image: photos.campus, likes: 248, time: '2h', type: 'photo', status: 'published' },
  { id: 'p2', name: 'Arjun Mehta', handle: '@arjun.builds', caption: 'Demo day, months of work, one very proud team. #BuildAtKIET', image: photos.event, mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', likes: 193, time: '4h', type: 'video', status: 'published' },
  { id: 'p3', name: 'Meera Nair', handle: '@meeran', caption: 'Our favourite corner of the library, always. 📚', image: photos.library, likes: 126, time: '6h', type: 'photo', status: 'published' },
  { id: 'p4', name: 'Kabir Singh', handle: '@kabirsingh', caption: 'Saturday morning, no excuses. #KIETRunClub', image: photos.sports, likes: 87, time: 'Yesterday', type: 'photo', status: 'published' },
]