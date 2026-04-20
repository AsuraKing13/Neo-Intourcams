
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ViewName, ItineraryItem, Cluster } from '../../types.ts';
import { useAppContext } from '../AppContext.tsx';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Spinner from '../ui/Spinner.tsx';
import { SparklesIcon, TourismClusterIcon, EventsCalendarIcon, PlusIcon, MapPinIcon, TrashIcon, QuestionMarkCircleIcon, XCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, GlobeAltIcon } from '../../constants.tsx';
import { generateItineraryRecommendations } from '../../services/gemini.ts';
import ClusterDetailModal from '../ui/ClusterDetailModal.tsx';
import InteractiveGuide from '../ui/InteractiveGuide.tsx';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AIPlannerViewProps {
  setCurrentView: (view: ViewName) => void;
  onAuthRequired?: (message?: string) => void;
}

interface Recommendation {
    id: string;
    type: 'cluster' | 'event';
    name: string;
    justification: string;
    location: string;
    latitude?: number;
    longitude?: number;
}

const activityOptions = ['Nature', 'Culture', 'Adventure', 'Food', 'Festivals', 'History', 'Relaxation'];

/**
 * Component to update map center when coordinates change
 */
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

/**
 * Component to handle map clicks for the start pin
 */
const LocationPicker: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const MyItinerary: React.FC = () => {
    const { myItinerary, isLoadingItinerary, removeItineraryItem, clearMyItinerary, clusters, events } = useAppContext();
    const [clearingItemId, setClearingItemId] = useState<string | null>(null);

    const handleRemove = async (item: ItineraryItem) => {
        setClearingItemId(item.id);
        await removeItineraryItem(item.id);
        setClearingItemId(null);
    };

    // Prepare map markers for itinerary items
    const markers = useMemo(() => {
        return myItinerary.map(item => {
            if (item.item_type === 'cluster') {
                const cluster = clusters.find(c => c.id === item.item_id);
                if (cluster && cluster.latitude && cluster.longitude) {
                    return { id: item.id, name: item.item_name, lat: cluster.latitude, lng: cluster.longitude, type: 'cluster' };
                }
            } else {
                const event = events.find(e => e.id === item.item_id);
                if (event && event.latitude && event.longitude) {
                    return { id: item.id, name: item.item_name, lat: event.latitude, lng: event.longitude, type: 'event' };
                }
            }
            return null;
        }).filter(Boolean) as { id: string, name: string, lat: number, lng: number, type: string }[];
    }, [myItinerary, clusters, events]);

    return (
        <div className="space-y-6">
            <Card id="my-itinerary-card" title="My Itinerary">
                {isLoadingItinerary ? (
                    <div className="text-center py-8"><Spinner /></div>
                ) : myItinerary.length === 0 ? (
                    <p className="text-center text-sm text-brand-text-secondary-light dark:text-brand-text-secondary py-8">
                        Your itinerary is empty. Get recommendations and add them here!
                    </p>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                        {myItinerary.map(item => (
                            <div key={item.id} className="p-3 rounded-md bg-neutral-100-light dark:bg-neutral-800-dark flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {item.item_type === 'cluster' 
                                        ? <TourismClusterIcon className="w-6 h-6 text-brand-green dark:text-brand-dark-green-text flex-shrink-0" />
                                        : <EventsCalendarIcon className="w-6 h-6 text-brand-green dark:text-brand-dark-green-text flex-shrink-0" />
                                    }
                                    <div className="truncate">
                                        <p className="font-semibold text-brand-text-light dark:text-brand-text truncate" title={item.item_name}>{item.item_name}</p>
                                        <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary capitalize">{item.item_type}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-500 hover:bg-red-500/10 flex-shrink-0" 
                                    onClick={() => handleRemove(item)}
                                    isLoading={clearingItemId === item.id}
                                    aria-label={`Remove ${item.item_name}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                 {myItinerary.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-200-light dark:border-neutral-700-dark text-right">
                        <Button variant="secondary" size="sm" onClick={clearMyItinerary}>
                            Clear All Items
                        </Button>
                    </div>
                )}
            </Card>

            {markers.length > 0 && (
                <Card title="Itinerary Map">
                    <div className="h-64 w-full rounded-lg overflow-hidden border border-neutral-200-light dark:border-neutral-700-dark z-0">
                        <MapContainer center={[markers[0].lat, markers[0].lng]} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {markers.map(marker => (
                                <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                                    <Popup>
                                        <div className="text-sm font-bold">{marker.name}</div>
                                        <div className="text-xs text-gray-500 capitalize">{marker.type}</div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </Card>
            )}
        </div>
    );
};

const aiPlannerTourSteps = [
    { selector: '#ai-planner-form', title: 'Set Your Preferences', content: 'Fill in your desired location, trip duration, budget, and select your interests.' },
    { selector: '#get-recommendations-btn', title: 'Get Recommendations', content: 'Click this to generate a personalized Sarawak trip plan using AI.' },
];

const AIPlannerView: React.FC<AIPlannerViewProps> = ({ setCurrentView, onAuthRequired }) => {
    const { clusters, events, currentUser, addItineraryItem, fetchProductsForClusters } = useAppContext();
    
    const [preferences, setPreferences] = useState({
        location: '',
        activities: new Set<string>(),
        duration: 3,
        budget: 500,
        startPin: null as { lat: number, lng: number } | null,
    });
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingItemId, setAddingItemId] = useState<string | null>(null);
    const [viewingCluster, setViewingCluster] = useState<Cluster | null>(null);
    const [isGuideActive, setIsGuideActive] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    
    // Hybrid Search States
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [noDataFound, setNoDataFound] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    // Default center for Sarawak (Kuching)
    const [mapCenter, setMapCenter] = useState<[number, number]>([1.5533, 110.3592]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Handle clicks outside suggestions to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLocationChange = (val: string) => {
        setPreferences(p => ({ ...p, location: val }));
        if (val.length > 1) {
            const now = new Date();
            const filtered = [
                ...clusters.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).map(c => ({ ...c, type: 'cluster' })),
                ...events.filter(e => {
                    const isMatch = e.title.toLowerCase().includes(val.toLowerCase());
                    const isNotPast = new Date(e.end_date) >= now;
                    return isMatch && isNotPast;
                }).map(e => ({ ...e, type: 'event' }))
            ].slice(0, 5);
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (item: any) => {
        setPreferences(p => ({ 
            ...p, 
            location: item.name || item.title,
            startPin: item.latitude && item.longitude ? { lat: item.latitude, lng: item.longitude } : p.startPin
        }));
        if (item.latitude && item.longitude) {
            setMapCenter([item.latitude, item.longitude]);
        }
        setShowSuggestions(false);
    };

    const handleGetRecommendations = async (useSearch: boolean = false) => {
        setIsLoading(true);
        setError(null);
        setNoDataFound(false);
        if (!useSearch) setRecommendations([]);

        try {
            const now = new Date();
            const locationLower = preferences.location.toLowerCase();
            const selectedActivities = Array.from(preferences.activities).map(a => String(a).toLowerCase());

            let relevantClusters = clusters;
            let relevantEvents = events.filter(e => new Date(e.end_date) >= now);

            // Filter by location
            if (isAdvancedMode && preferences.startPin) {
                const radius = preferences.duration * 50; // Roughly 50km per day
                const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                    const R = 6371;
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    return R * c;
                };

                relevantClusters = clusters.filter(c => {
                    if (!c.latitude || !c.longitude) return false;
                    return getDist(preferences.startPin!.lat, preferences.startPin!.lng, c.latitude, c.longitude) <= radius;
                });
                relevantEvents = events.filter(e => {
                    if (!e.latitude || !e.longitude) return false;
                    return getDist(preferences.startPin!.lat, preferences.startPin!.lng, e.latitude, e.longitude) <= radius;
                });
            } else if (locationLower) {
                relevantClusters = clusters.filter(c => (c.display_address || c.location || c.name).toLowerCase().includes(locationLower));
                relevantEvents = events.filter(e => (e.display_address || e.location_name || e.title).toLowerCase().includes(locationLower));
            }

            const allLocationItems = [
                ...relevantClusters.map(c => ({ ...c, itemType: 'cluster' as const })),
                ...relevantEvents.map(e => ({ ...e, itemType: 'event' as const }))
            ];

            // Prioritize by activities but don't strictly filter out others
            let prioritizedItems = allLocationItems;
            if (selectedActivities.length > 0) {
                const matches = allLocationItems.filter(item => {
                    if (item.itemType === 'cluster') {
                        return item.category.some(cat => selectedActivities.includes(String(cat).toLowerCase()));
                    } else {
                        return selectedActivities.includes(item.category.toLowerCase());
                    }
                });
                const nonMatches = allLocationItems.filter(item => !matches.includes(item));
                prioritizedItems = [...matches, ...nonMatches];
            }
            
            // If no data found in DB and we aren't already using search, show the "No Data" state
            if (allLocationItems.length === 0 && !useSearch) {
                setNoDataFound(true);
                setIsLoading(false);
                return;
            }

            // Send exactly 15 items for best processing, prioritized by interest
            const selectedItems = prioritizedItems.slice(0, 15);

            // Fetch products for clusters to give AI budget context
            const clusterIds = selectedItems.filter(i => i.itemType === 'cluster').map(i => i.id);
            const allProducts = clusterIds.length > 0 ? await fetchProductsForClusters(clusterIds) : [];

            const itemsWithProducts = selectedItems.map(item => {
                if (item.itemType === 'cluster') {
                    const products = allProducts.filter(p => p.cluster_id === item.id);
                    return { ...item, products };
                }
                return item;
            });

            const result = await generateItineraryRecommendations(preferences, itemsWithProducts, useSearch, isAdvancedMode);
            setRecommendations(result);

        } catch (err: any) {
            console.error("AI Planner Error:", err);
            setError(err.message);
            if (err.message.includes('Quota')) {
                setCooldown(15);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = (item: Recommendation) => {
        if (item.type === 'cluster') {
            const fullCluster = clusters.find(c => c.id === item.id);
            if (fullCluster) setViewingCluster(fullCluster);
            else {
                sessionStorage.setItem('initialClusterSearch', item.name);
                setCurrentView(ViewName.TourismCluster);
            }
        } else {
            sessionStorage.setItem('initialEventSearch', item.name);
            setCurrentView(ViewName.EventsCalendar);
        }
    };
    
    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card title="AI Trip Planner" titleIcon={<SparklesIcon className="w-6 h-6" />}>
                    <div id="ai-planner-form" className="space-y-6">
                        <div className="relative" ref={suggestionRef}>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input 
                                        label="Where to?" 
                                        placeholder="Type a location (e.g. Kuching, Miri...)" 
                                        value={preferences.location} 
                                        onChange={e => handleLocationChange(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mb-1"
                                    onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                                    rightIcon={isAdvancedMode ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                >
                                    {isAdvancedMode ? 'Simple' : 'Advanced'}
                                </Button>
                            </div>
                            
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800-dark border border-neutral-200-light dark:border-neutral-700-dark rounded-md shadow-xl overflow-hidden">
                                    {suggestions.map((item, idx) => (
                                        <button
                                            key={idx}
                                            className="w-full px-4 py-3 text-left hover:bg-neutral-100-light dark:hover:bg-neutral-700-dark flex items-center gap-3 transition-colors"
                                            onClick={() => handleSelectSuggestion(item)}
                                        >
                                            {item.type === 'cluster' ? <TourismClusterIcon className="w-5 h-5 text-brand-green" /> : <EventsCalendarIcon className="w-5 h-5 text-brand-green" />}
                                            <div>
                                                <p className="font-semibold text-sm">{item.name || item.title}</p>
                                                <p className="text-xs text-brand-text-secondary">{item.display_address || item.location_name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isAdvancedMode && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-neutral-50-light dark:bg-neutral-900/40 border border-neutral-200-light dark:border-neutral-800-dark animate-modalShow">
                                <div className="space-y-4">
                                    <Input label="Days" type="number" min="1" max="14" value={String(preferences.duration)} onChange={e => setPreferences(p => ({ ...p, duration: parseInt(e.target.value, 10) || 1 }))} />
                                    <Input label="Budget (RM)" type="number" min="0" value={String(preferences.budget)} onChange={e => setPreferences(p => ({ ...p, budget: parseInt(e.target.value, 10) || 0 }))} />
                                    <div className="p-3 rounded bg-brand-green/5 border border-brand-green/10">
                                        <p className="text-xs text-brand-text-secondary leading-relaxed">
                                            <SparklesIcon className="w-3 h-3 inline mr-1 text-brand-green" />
                                            Advanced mode uses your duration, budget, and starting point to find the best matching spots.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Start Pin (Optional)</label>
                                    <div className="h-48 w-full rounded-md overflow-hidden border border-neutral-300-light dark:border-neutral-700-dark z-0">
                                        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <MapUpdater center={mapCenter} />
                                            <LocationPicker onLocationSelect={(lat, lng) => setPreferences(p => ({ ...p, startPin: { lat, lng } }))} />
                                            {preferences.startPin && (
                                                <Marker position={[preferences.startPin.lat, preferences.startPin.lng]}>
                                                    <Popup>Starting Point</Popup>
                                                </Marker>
                                            )}
                                        </MapContainer>
                                    </div>
                                    <p className="text-[10px] text-brand-text-secondary text-center italic">Click map to drop a custom starting pin</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">Interests</label>
                            <div className="flex flex-wrap gap-2">
                                {activityOptions.map(activity => (
                                    <button
                                        key={activity}
                                        onClick={() => {
                                            const next = new Set(preferences.activities);
                                            if (next.has(activity)) next.delete(activity);
                                            else next.add(activity);
                                            setPreferences(p => ({ ...p, activities: next }));
                                        }}
                                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${preferences.activities.has(activity) ? 'bg-brand-green text-white' : 'bg-neutral-200-light dark:bg-neutral-700-dark'}`}
                                    >
                                        {activity}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div id="get-recommendations-btn" className="flex justify-end gap-3 items-center">
                            {cooldown > 0 && <span className="text-xs text-brand-text-secondary animate-pulse">Wait {cooldown}s...</span>}
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={() => handleGetRecommendations(false)} 
                                isLoading={isLoading} 
                                disabled={cooldown > 0}
                                leftIcon={<SparklesIcon className="w-5 h-5" />}
                            >
                                {isAdvancedMode ? 'Perform Advanced Search' : 'Get Recommendations'}
                            </Button>
                        </div>
                    </div>
                </Card>

                {noDataFound && (
                    <Card className="border-2 border-brand-green/30 bg-brand-green/5 animate-modalShow">
                        <div className="flex flex-col items-center text-center p-4 space-y-4">
                            <QuestionMarkCircleIcon className="w-12 h-12 text-brand-green opacity-50" />
                            <div>
                                <h3 className="text-lg font-bold">No Verified Data for "{preferences.location}"</h3>
                                <p className="text-sm text-brand-text-secondary max-w-md mx-auto mt-1">
                                    We don't have verified tourism spots for this location in our database yet. 
                                    Would you like the AI to search the web for suggestions?
                                </p>
                            </div>
                            <Button 
                                variant="primary" 
                                leftIcon={<SparklesIcon className="w-5 h-5" />}
                                onClick={() => handleGetRecommendations(true)}
                                isLoading={isLoading}
                            >
                                Search Web for Suggestions
                            </Button>
                        </div>
                    </Card>
                )}

                {error && (
                    <Card className={`border-2 ${error.includes('CRITICAL') ? 'border-red-600 bg-red-100 dark:bg-red-900/20' : error.includes('Quota') ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 'border-red-400 bg-red-50 dark:bg-red-900/10'}`}>
                        <div className="flex items-start gap-4 p-2">
                            {error.includes('Quota') ? <ClockIcon className="w-8 h-8 text-yellow-600 flex-shrink-0" /> : <XCircleIcon className="w-8 h-8 text-red-600 flex-shrink-0" />}
                            <div>
                                <h4 className={`font-bold ${error.includes('Quota') ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {error.includes('CRITICAL') ? 'Action Required: AI System Suspended' : error.includes('Quota') ? 'Service Temporarily Busy' : 'AI System Error'}
                                </h4>
                                <p className={`mt-1 text-sm leading-relaxed ${error.includes('CRITICAL') ? 'text-red-800 dark:text-red-300 font-semibold' : error.includes('Quota') ? 'text-yellow-800 dark:text-yellow-300' : 'text-red-600 dark:text-red-300'}`}>
                                    {error}
                                </p>
                                {error.includes('CRITICAL') && (window as any).aistudio && (
                                    <div className="mt-3">
                                        <Button 
                                            variant="primary" 
                                            size="sm" 
                                            onClick={async () => {
                                                await (window as any).aistudio.openSelectKey();
                                                handleGetRecommendations(false);
                                            }}
                                        >
                                            Select API Key
                                        </Button>
                                    </div>
                                )}
                                {error.includes('Quota') && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => handleGetRecommendations(false)} 
                                            isLoading={isLoading}
                                            disabled={cooldown > 0}
                                        >
                                            {cooldown > 0 ? `Retrying in ${cooldown}s...` : 'Try Again Now'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {recommendations.length > 0 && (
                    <div className="space-y-6 animate-modalShow">
                        <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text">Your Personalized Plan</h2>
                        {recommendations.map((rec, index) => (
                            <Card key={index} className="hover:shadow-lg transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {rec.type === 'cluster' ? <TourismClusterIcon className="w-5 h-5 text-brand-green"/> : <EventsCalendarIcon className="w-5 h-5 text-brand-green"/>}
                                            <h3 className="text-xl font-bold">{rec.name}</h3>
                                        </div>
                                        <p className="text-sm text-brand-text-secondary flex items-center"><MapPinIcon className="w-4 h-4 mr-1"/> {rec.location}</p>
                                        <p className="text-sm italic">"{rec.justification}"</p>
                                    </div>
                                    <div className="flex flex-row md:flex-col gap-2 justify-end">
                                        <Button variant="secondary" size="sm" onClick={() => handleViewDetails(rec)}>Details</Button>
                                        <Button variant="primary" size="sm" onClick={async () => {
                                            if (!currentUser) onAuthRequired?.("Please log in to save to your itinerary.");
                                            else {
                                                setAddingItemId(rec.id);
                                                await addItineraryItem(rec.id, rec.type, rec.name);
                                                setAddingItemId(null);
                                            }
                                        }} isLoading={addingItemId === rec.id}>Add</Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            <div className="lg:col-span-1"><MyItinerary /></div>
        </div>
        {viewingCluster && <ClusterDetailModal cluster={viewingCluster} onClose={() => setViewingCluster(null)} />}
        <InteractiveGuide steps={aiPlannerTourSteps} isOpen={isGuideActive} onClose={() => setIsGuideActive(false)} />
        </>
    );
};

export default AIPlannerView;
