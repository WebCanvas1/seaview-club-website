import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Phone,
  Quote,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AvailabilityStatus = 'available' | 'booked' | 'club_event';
type Availability = { date: string; status: AvailabilityStatus; label: string | null };
type ClubEvent = { id: string; date: string; title: string; time: string | null; description: string | null; image_url: string | null };
type GalleryItem = { id: string; image_url: string; alt_text: string | null; sort_order: number };

type CalendarCell = { date: Date; iso: string; outside: boolean };

const exteriorImage = 'https://images.pexels.com/photos/38777326/pexels-photo-38777326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const hallImage = 'https://images.pexels.com/photos/13146328/pexels-photo-13146328.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const detailImage = 'https://images.pexels.com/photos/30505259/pexels-photo-30505259.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const fallbackAvailability: Availability[] = [
  { date: '2026-10-02', status: 'club_event', label: "Rock 'n' Roll Dance Social" },
  { date: '2026-10-09', status: 'club_event', label: 'Darts Match Night' },
  { date: '2026-10-16', status: 'club_event', label: '8-Ball Pool Social' },
  { date: '2026-10-23', status: 'booked', label: null },
  { date: '2026-10-30', status: 'club_event', label: "Rock 'n' Roll Dance Social" },
  { date: '2026-11-06', status: 'club_event', label: 'Darts Match Night' },
  { date: '2026-11-20', status: 'booked', label: null },
  { date: '2026-11-27', status: 'club_event', label: "Rock 'n' Roll Dance Social" },
  { date: '2026-12-18', status: 'booked', label: null },
];

const fallbackEvents: ClubEvent[] = [
  { id: '1', date: '2026-10-02', title: "Rock 'n' Roll Dance Social", time: '7:30 PM', description: "Social dancing on the club's dedicated dance floor. All welcome.", image_url: null },
  { id: '2', date: '2026-10-09', title: 'Darts Match Night', time: '7:00 PM', description: 'Darts competition night — join in or come watch.', image_url: null },
  { id: '3', date: '2026-10-16', title: '8-Ball Pool Social', time: '7:30 PM', description: 'Casual pool night for players of all levels.', image_url: null },
];

const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const displayDate = (iso: string): string => new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));

const getCalendarCells = (month: Date): CalendarCell[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, iso: formatDateInput(date), outside: date.getMonth() !== month.getMonth() };
  });
};

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [availability, setAvailability] = useState<Availability[]>(fallbackAvailability);
  const [events, setEvents] = useState<ClubEvent[]>(fallbackEvents);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 9, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadSiteData = async (): Promise<void> => {
      try {
        const response = await fetch('/api/public');
        if (response.ok) {
          const data = await response.json();
          if (data.availability?.length) setAvailability(data.availability as Availability[]);
          if (data.events?.length) setEvents(data.events as ClubEvent[]);
          if (data.gallery?.length) setGallery(data.gallery as GalleryItem[]);
          setLoadingData(false);
          return;
        }
      } catch {}
      if (supabase) {
        const [availabilityResult, eventsResult] = await Promise.all([
          supabase.from('public_availability').select('date, status, label'),
          supabase.from('events').select('id, date, title, time, description, image_url').order('date', { ascending: true }),
        ]);
        if (!availabilityResult.error && availabilityResult.data?.length) setAvailability(availabilityResult.data as Availability[]);
        if (!eventsResult.error && eventsResult.data?.length) setEvents(eventsResult.data as ClubEvent[]);
      }
      setLoadingData(false);
    };
    void loadSiteData();
  }, []);

  const availabilityMap = useMemo(() => new Map(availability.map((item) => [item.date, item])), [availability]);
  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);
  const upcomingEvents = useMemo(() => events.filter((event) => new Date(`${event.date}T12:00:00`) >= new Date('2026-09-22T12:00:00')).slice(0, 3), [events]);

  const scrollTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const selectDate = (date: string): void => {
    const status = availabilityMap.get(date)?.status ?? 'available';
    if (status !== 'available') return;
    setSelectedDate(date);
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitEnquiry = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    const formData = new FormData(event.currentTarget);
    const acknowledged = formData.get('acknowledged') === 'on';
    if (!acknowledged) {
      setFormError('Please confirm that this enquiry does not confirm a booking.');
      return;
    }
    if (!supabase) {
      const subject = encodeURIComponent('Seaview Club function enquiry');
      const body = encodeURIComponent([
        `Name: ${String(formData.get('fullName') ?? '').trim()}`,
        `Email: ${String(formData.get('email') ?? '').trim()}`,
        `Phone: ${String(formData.get('phone') ?? '').trim()}`,
        `Function: ${String(formData.get('functionType') ?? '')}`,
        `Preferred date: ${String(formData.get('preferredDate') ?? '')}`,
        `Alternative date: ${String(formData.get('alternativeDate') ?? '')}`,
        `Approx. guests: ${String(formData.get('guests') ?? '')}`,
        '',
        String(formData.get('message') ?? ''),
      ].join('\n'));
      window.location.href = `mailto:bookings@seaviewclubgeelong.com?subject=${subject}&body=${body}`;
      return;
    }
    const { error } = await supabase.from('enquiries').insert({
      full_name: String(formData.get('fullName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      preferred_date: String(formData.get('preferredDate') ?? '') || null,
      alternative_date: String(formData.get('alternativeDate') ?? '') || null,
      function_type: String(formData.get('functionType') ?? '') || null,
      guests: Number(formData.get('guests')) || null,
      message: String(formData.get('message') ?? '') || null,
      acknowledged,
    });
    if (error) {
      setFormError('We could not send your enquiry just now. Please call the club on 0452 077 627.');
      return;
    }
    setFormSent(true);
    event.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => scrollTo('top')} className="group flex items-center gap-3 text-left" aria-label="Seaview Club home">
            <span className="flex h-10 w-10 items-center justify-center border border-sand/60 font-display text-lg text-sand transition group-hover:bg-sand group-hover:text-ink">SC</span>
            <span><span className="block font-display text-lg leading-none tracking-wide">SEAVIEW CLUB</span><span className="mt-1 block text-[10px] uppercase tracking-[0.24em] text-white/55">Lovely Banks · Victoria</span></span>
          </button>
          <nav className="hidden items-center gap-7 lg:flex">
            {['Venue Hire', 'Availability Calendar', "What's On", 'Club Activities', 'About', 'Contact'].map((item) => <button key={item} onClick={() => scrollTo(item === 'Venue Hire' ? 'venue' : item === 'Availability Calendar' ? 'availability' : item === "What's On" ? 'whats-on' : item === 'Club Activities' ? 'activities' : item.toLowerCase())} className="text-sm text-white/75 transition hover:text-sand">{item}</button>)}
            <button onClick={() => scrollTo('availability')} className="button button-small button-sand">Check availability <ArrowRight size={15} /></button>
          </nav>
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <nav className="border-t border-white/10 bg-ink px-5 py-5 lg:hidden"><div className="flex flex-col gap-4">{['Venue Hire', "What's On", 'Club Activities', 'About', 'Contact'].map((item) => <button key={item} onClick={() => scrollTo(item === 'Venue Hire' ? 'venue' : item === "What's On" ? 'whats-on' : item === 'Club Activities' ? 'activities' : item.toLowerCase())} className="border-b border-white/10 py-2 text-left text-sm text-white/80">{item}</button>)}<button onClick={() => scrollTo('availability')} className="button button-sand mt-2 w-full">Check availability <ArrowRight size={15} /></button></div></nav>}
      </header>

      <main id="top">
        <section className="relative flex min-h-[700px] items-end overflow-hidden bg-ink pt-[74px] text-white lg:min-h-[780px]">
          <img src={exteriorImage} alt="Seaview Club building and grounds in Lovely Banks" className="absolute inset-0 h-full w-full object-cover object-center opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/55 to-ink/20" /><div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/15" />
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 lg:px-8 lg:pb-28"><div className="max-w-3xl animate-rise"><p className="eyebrow text-sand">A hidden gem in Lovely Banks</p><h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.96] tracking-tight md:text-7xl lg:text-[90px]">Your local club.<br /><span className="text-sand">Your next celebration.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-white/80 md:text-lg">A welcoming community club and versatile function venue with a spacious hall, dance floor, full kitchen and staffed bar.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => scrollTo('availability')} className="button button-sand">Check venue availability <ArrowRight size={16} /></button><button onClick={() => scrollTo('enquire')} className="button button-outline">Enquire about a function</button></div><div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-5 text-[11px] font-medium uppercase tracking-[0.17em] text-white/70"><span>Functions</span><span>Dance floor</span><span>Full kitchen</span><span>Staffed bar</span></div></div></div>
        </section>

        <section className="border-b border-ink/10 bg-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-28"><div><p className="eyebrow">More than just a club</p><h2 className="section-title mt-4">A place to gather, play and celebrate.</h2></div><div><p className="text-lg leading-8 text-ink/70">Seaview Club is a welcoming local sporting and social club in Lovely Banks, just outside Geelong. Whether you're joining us for pool, darts or rock 'n' roll dancing, or looking for somewhere to celebrate a special occasion, our hidden gem offers genuine community character.</p><button onClick={() => scrollTo('about')} className="link-arrow mt-7">Discover the club <ArrowRight size={17} /></button></div></div></section>

        <section id="venue" className="bg-cream"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><div className="relative"><div className="overflow-hidden"><img src={hallImage} alt="The Seaview Club function hall with dance floor and festoon lighting" className="aspect-[4/3] w-full object-cover transition duration-700 hover:scale-105" /></div><div className="absolute -bottom-7 -right-2 hidden w-44 bg-sand p-5 sm:block"><p className="font-display text-3xl text-ink">Made for<br />good times.</p></div></div><div><p className="eyebrow">Venue hire</p><h2 className="section-title mt-4">A space for your next occasion.</h2><p className="mt-6 text-base leading-7 text-ink/70">From birthday parties to anniversaries, engagements, community events and club celebrations, the Seaview Club hall is an easygoing space ready for your people.</p><div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7">{[['Spacious function hall', 'Indoor space for social events and functions.'], ['Dance floor', 'A proper floor for celebrations and dancing.'], ['Full kitchen', 'Kitchen facilities available for your function.'], ['Staffed bar', 'A staffed bar available for functions.']].map(([title, copy]) => <div key={title} className="border-t border-ink/15 pt-4"><p className="font-display text-lg">{title}</p><p className="mt-2 text-sm leading-6 text-ink/60">{copy}</p></div>)}</div><button onClick={() => scrollTo('availability')} className="button button-navy mt-9">Check available dates <ArrowRight size={16} /></button></div></div></div></section>

        <section id="availability" className="relative bg-navy text-white"><div className="absolute inset-x-0 top-0 h-1 bg-sand" /><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><div className="mb-10 flex flex-col gap-4 border-b border-white/15 pb-8 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-sand">Venue availability calendar</p><h2 className="mt-3 font-display text-4xl text-white md:text-5xl">Check your date at a glance.</h2></div><p className="max-w-md text-sm leading-6 text-white/65">Planning a function? Use the live calendar below to quickly see available dates, existing bookings and club events.</p></div><div className="grid gap-12 lg:grid-cols-[0.62fr_1.38fr] lg:items-start"><div className="lg:sticky lg:top-28"><p className="eyebrow text-sand">How it works</p><h2 className="section-title mt-4 text-white">Find a date worth celebrating.</h2><p className="mt-5 leading-7 text-white/65">Browse the calendar to see which dates appear available. Availability is indicative until the club confirms your booking.</p><div className="mt-8 space-y-3 text-sm text-white/70"><div className="flex items-center gap-3"><span className="legend-dot bg-[#a7c9a3]" />Available</div><div className="flex items-center gap-3"><span className="legend-dot bg-[#bd8d87]" />Booked</div><div className="flex items-center gap-3"><span className="legend-dot bg-[#7099bc]" />Club event</div></div><p className="mt-8 flex items-center gap-2 text-xs text-white/45"><Clock3 size={14} /> Calendar shown in Australian Eastern time</p></div><div className="rounded-sm bg-white p-4 text-ink shadow-2xl ring-4 ring-sand/20 sm:p-8"><div className="flex items-center justify-between border-b border-ink/10 pb-5"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="calendar-nav" aria-label="Previous month"><ChevronLeft size={19} /></button><div className="text-center"><p className="font-display text-2xl">{calendarMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</p>{loadingData && <p className="mt-1 text-[10px] uppercase tracking-widest text-ink/40">Updating calendar</p>}</div><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="calendar-nav" aria-label="Next month"><ChevronRight size={19} /></button></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-ink/40 sm:gap-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="py-2">{day}</span>)}{calendarCells.map(({ date, iso, outside }) => { const entry = availabilityMap.get(iso); const status = entry?.status ?? 'available'; const isSelected = selectedDate === iso; return <button key={iso} onClick={() => selectDate(iso)} aria-label={`${displayDate(iso)} ${status}`} disabled={status !== 'available'} className={`calendar-day ${outside ? 'opacity-30' : ''} ${status} ${isSelected ? 'selected' : ''}`}><span>{date.getDate()}</span>{entry?.label && <span className="calendar-label">Club event</span>}</button>; })}</div><div className="mt-6 flex flex-col justify-between gap-4 border-t border-ink/10 pt-5 sm:flex-row sm:items-center"><p className="text-xs text-ink/55">Today: <span className="font-medium text-ink">{new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span></p><button onClick={() => { setCalendarMonth(new Date(2026, 9, 1)); setSelectedDate(null); }} className="text-left text-xs font-semibold uppercase tracking-wider text-navy underline underline-offset-4">Return to October 2026</button></div>{selectedDate && <div className="mt-5 flex flex-col gap-4 border-l-4 border-sand bg-sand/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-ink/50">Interested in this date?</p><p className="mt-1 font-display text-xl">{displayDate(selectedDate)}</p></div><button onClick={() => document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' })} className="button button-navy">Enquire about this date <ArrowRight size={15} /></button></div>}</div></div></div></section>

        <section id="enquire" className="bg-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-28"><div><p className="eyebrow">Function enquiries</p><h2 className="section-title mt-4">Tell us a little about your plans.</h2><p className="mt-5 leading-7 text-ink/65">Send through your preferred date and event details. Our team will get in touch to discuss your function and confirm what's possible.</p><div className="mt-8 rounded-sm bg-cream p-5"><p className="text-sm font-semibold">For urgent booking enquiries</p><a href="tel:+61452077627" className="mt-2 block font-display text-2xl text-navy">0452 077 627</a></div></div><div>{formSent ? <div className="flex min-h-[480px] flex-col items-center justify-center bg-cream px-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfeedd] text-[#3b7044]"><Check size={30} /></span><h3 className="mt-6 font-display text-3xl">Enquiry received.</h3><p className="mt-3 max-w-md leading-7 text-ink/65">Thanks for getting in touch. The Seaview Club team will contact you to discuss your plans.</p><button onClick={() => setFormSent(false)} className="link-arrow mt-7">Send another enquiry <ArrowRight size={16} /></button></div> : <form onSubmit={submitEnquiry} className="grid gap-5 bg-cream p-5 sm:grid-cols-2 sm:p-8"><div className="sm:col-span-2"><p className="mb-1 text-xs uppercase tracking-wider text-ink/50">Your details</p></div><label>Full name<input required name="fullName" type="text" placeholder="Your full name" /></label><label>Email<input required name="email" type="email" placeholder="you@example.com" /></label><label>Phone<input required name="phone" type="tel" placeholder="04xx xxx xxx" /></label><label>Type of function<select required name="functionType" defaultValue=""><option value="" disabled>Select an option</option><option>Birthday party</option><option>Anniversary</option><option>Engagement</option><option>Community event</option><option>Social function</option><option>Private function</option><option>Something else</option></select></label><label>Preferred date<input required name="preferredDate" type="date" value={selectedDate ?? ''} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>Alternative date <span className="normal-case tracking-normal text-ink/45">(optional)</span><input name="alternativeDate" type="date" /></label><label>Approx. guests<input name="guests" type="number" min="1" placeholder="Number of guests" /></label><label className="sm:col-span-2">Message / additional information<textarea name="message" rows={4} placeholder="Tell us a little about your event..." /></label><label className="sm:col-span-2 flex cursor-pointer items-start gap-3 text-sm normal-case tracking-normal text-ink/65"><input required name="acknowledged" type="checkbox" className="mt-1 h-4 w-4 accent-navy" /><span>I understand that submitting this form does not confirm my booking.</span></label>{formError && <p className="sm:col-span-2 text-sm text-[#9c4c44]">{formError}</p>}<button type="submit" className="button button-navy sm:col-span-2 sm:w-fit">Send function enquiry <ArrowRight size={16} /></button></form>}</div></div></section>

        <section className="bg-sand"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"><div className="grid gap-10 md:grid-cols-3">{[['01', 'Check availability', 'Choose your preferred date using our availability calendar.'], ['02', 'Send an enquiry', 'Tell us a little about your event and what you have in mind.'], ['03', "We'll get in touch", 'The Seaview Club team will contact you to discuss your function.']].map(([number, title, copy]) => <div key={number} className="relative border-t border-ink/25 pt-5"><span className="font-display text-sm text-ink/50">{number}</span><h3 className="mt-4 font-display text-2xl">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-ink/65">{copy}</p></div>)}</div></div></section>

        <section id="activities" className="bg-cream"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">Club activities</p><h2 className="section-title mt-4">There's always something happening.</h2></div><p className="max-w-sm leading-7 text-ink/65">Interested in joining one of our activities? Contact the club to find out what's happening this week.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[[<Trophy size={25} />, '8-Ball pool', 'A welcoming place for players and members to enjoy social and competitive pool.'], [<CircleCheck size={25} />, 'Darts', 'Enjoy darts as part of the club’s sporting and social community.'], [<Sparkles size={25} />, "Rock 'n' roll dancing", 'Social dancing and a great way to enjoy the club’s dedicated dance floor.']].map(([icon, title, copy]) => <div key={title as string} className="activity-card"><div className="text-sand">{icon}</div><h3 className="mt-7 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-white/65">{copy}</p><button onClick={() => scrollTo('contact')} className="mt-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand">Find out more <ArrowRight size={14} /></button></div>)}</div></div></section>

        <section id="whats-on" className="bg-white"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">What's on</p><h2 className="section-title mt-4">Good company, close to home.</h2></div><p className="max-w-sm text-sm leading-6 text-ink/60">A look at some of the sporting and social activity coming up at the club.</p></div>{upcomingEvents.length ? <div className="mt-12 grid gap-5 md:grid-cols-3">{upcomingEvents.map((event) => <article key={event.id} className="border-t-2 border-navy pt-5"><p className="text-xs font-semibold uppercase tracking-widest text-navy">{new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${event.date}T12:00:00`))}</p><h3 className="mt-4 font-display text-2xl">{event.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-ink/50"><Clock3 size={14} /> {event.time ?? 'Details to come'}</p><p className="mt-4 text-sm leading-6 text-ink/65">{event.description}</p><button className="link-arrow mt-6 text-xs">Learn more <ArrowRight size={14} /></button></article>)}</div> : <div className="mt-12 border border-dashed border-ink/20 py-16 text-center"><p className="font-display text-2xl">More events coming soon.</p></div>}</div></section>

        <section id="about" className="bg-ink text-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-28"><div><p className="eyebrow text-sand">About Seaview Club</p><h2 className="section-title mt-4 text-white">A club built around community.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-white/70">Sport, social connection, local gatherings and a warm welcome — Seaview Club brings people together in a way that feels easy and genuine.</p><div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-5 text-center"><div><Users className="mx-auto text-sand" size={22} /><p className="mt-3 text-xs uppercase tracking-wider text-white/55">Community</p></div><div><Trophy className="mx-auto text-sand" size={22} /><p className="mt-3 text-xs uppercase tracking-wider text-white/55">Sport</p></div><div><Sparkles className="mx-auto text-sand" size={22} /><p className="mt-3 text-xs uppercase tracking-wider text-white/55">Social</p></div></div></div><div className="relative mx-auto max-w-sm"><div className="absolute -inset-3 border border-sand/30" /><img src={detailImage} alt="Seaview Club branded stubby holder on the club bar" className="relative aspect-square w-full object-cover" /><div className="absolute -bottom-6 -left-5 bg-sand p-4 text-ink"><Quote size={20} /><p className="mt-2 max-w-[190px] font-display text-lg leading-tight">Local spirit, made for sharing.</p></div></div></div></section>

        <section id="gallery" className="bg-cream"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="flex items-end justify-between"><div><p className="eyebrow">Gallery</p><h2 className="section-title mt-4">Life at Seaview Club.</h2></div><p className="hidden text-sm text-ink/50 md:block">Tap an image to view it larger</p></div><div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">{(gallery.length?gallery:[{id:'exterior',image_url:exteriorImage,alt_text:'Seaview Club exterior',sort_order:0},{id:'hall',image_url:hallImage,alt_text:'Seaview Club function hall',sort_order:1},{id:'detail',image_url:detailImage,alt_text:'Seaview Club detail',sort_order:2}]).map((image,index)=><button key={image.id} onClick={()=>setLightboxImage(image.image_url)} className={`group overflow-hidden ${index===0?'col-span-2 row-span-2':''}`}><img src={image.image_url} alt={image.alt_text||'Seaview Club gallery image'} className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${index===0?'min-h-[340px]':'min-h-[165px]'}`}/></button>)}</div></div></section>

        <section id="contact" className="bg-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-28"><div><p className="eyebrow">Visit us</p><h2 className="section-title mt-4">Come and discover Seaview Club.</h2><p className="mt-5 leading-7 text-ink/65">A local place for a good night out, a friendly game, or your next gathering.</p><div className="mt-8 space-y-5"><div className="flex gap-4"><MapPin className="mt-1 shrink-0 text-navy" size={19} /><p>335 Bluestone Bridge Road<br />Lovely Banks VIC 3213<br />Australia</p></div><a href="tel:+61452077627" className="flex gap-4 transition hover:text-navy"><Phone className="mt-1 shrink-0 text-navy" size={19} /><span>0452 077 627</span></a><a href="mailto:bookings@seaviewclubgeelong.com" className="flex gap-4 transition hover:text-navy"><Mail className="mt-1 shrink-0 text-navy" size={19} /><span>bookings@seaviewclubgeelong.com</span></a><a href="https://www.instagram.com/seaviewclubinc" target="_blank" rel="noreferrer" className="flex gap-4 transition hover:text-navy"><Instagram className="mt-1 shrink-0 text-navy" size={19} /><span>@seaviewclubinc</span><ExternalLink size={13} className="mt-1" /></a></div></div><div className="min-h-[330px] overflow-hidden bg-[#dbe2e2]"><iframe title="Map showing Seaview Club in Lovely Banks" src="https://www.openstreetmap.org/export/embed.html?bbox=144.276%2C-38.061%2C144.36%2C-37.99&layer=mapnik&marker=-38.025%2C144.318" className="h-full min-h-[330px] w-full border-0 grayscale" loading="lazy" /></div></div></section>

        <section className="relative overflow-hidden bg-navy py-24 text-white lg:py-32"><img src={hallImage} alt="Seaview Club dance floor ready for a celebration" className="absolute inset-0 h-full w-full object-cover opacity-25" /><div className="absolute inset-0 bg-navy/80" /><div className="relative mx-auto max-w-7xl px-5 text-center lg:px-8"><p className="eyebrow text-sand">Your next occasion starts here</p><h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-none md:text-7xl">Planning your next function?</h2><p className="mx-auto mt-5 max-w-md text-white/70">Discover one of Lovely Banks' hidden gems.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => scrollTo('availability')} className="button button-sand">Check available dates <ArrowRight size={16} /></button><button onClick={() => scrollTo('enquire')} className="button button-outline">Enquire now</button></div></div></section>
      </main>

      <footer className="bg-ink text-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr_0.9fr] lg:px-8"><div><p className="font-display text-2xl">SEAVIEW CLUB</p><p className="mt-3 max-w-xs text-sm leading-6 text-white/55">A welcoming local club and function venue in Lovely Banks, Victoria.</p><p className="mt-7 text-sm leading-6 text-white/65">335 Bluestone Bridge Road<br />Lovely Banks VIC 3213<br />Australia</p></div><div><p className="eyebrow text-sand">Explore</p><div className="mt-5 grid gap-3 text-sm text-white/65"><button onClick={() => scrollTo('venue')} className="text-left hover:text-sand">Venue hire</button><button onClick={() => scrollTo('availability')} className="text-left hover:text-sand">Availability</button><button onClick={() => scrollTo('whats-on')} className="text-left hover:text-sand">What's on</button><button onClick={() => scrollTo('activities')} className="text-left hover:text-sand">Club activities</button></div></div><div><p className="eyebrow text-sand">Contact</p><div className="mt-5 grid gap-3 text-sm text-white/65"><a href="tel:+61452077627" className="hover:text-sand">0452 077 627</a><a href="mailto:bookings@seaviewclubgeelong.com" className="break-all hover:text-sand">bookings@seaviewclubgeelong.com</a><a href="https://www.instagram.com/seaviewclubinc" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-sand"><Instagram size={15} /> @seaviewclubinc</a></div></div></div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/40 lg:px-8">© Seaview Club Inc. · Lovely Banks, Victoria</div></footer>

      <a href="#availability" className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-center gap-2 bg-sand px-5 py-4 text-xs font-semibold uppercase tracking-widest text-ink shadow-xl lg:hidden">Check availability <ArrowRight size={15} /></a>
      {lightboxImage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-5" onClick={() => setLightboxImage(null)}><button className="absolute right-5 top-5 text-white" onClick={() => setLightboxImage(null)} aria-label="Close image"><X size={28} /></button><img src={lightboxImage} alt="Expanded Seaview Club gallery image" className="max-h-[85vh] max-w-full object-contain" /></div>}
    </div>
  );
}

export default App;
