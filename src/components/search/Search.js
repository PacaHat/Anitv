"use client"
import Image from 'next/image';
import { Fragment, useEffect, useRef, useState } from "react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import axios from "axios";
import Link from 'next/link';
import UseDebounce from "@/utils/UseDebounce";
import { AdvancedSearch } from "@/lib/Anilistfunctions"; // Un-commented as per instructions
import { useRouter } from 'next/navigation';
import { useTitle, useSearchbar } from '@/lib/store';
import { useStore } from 'zustand';

function Search() {
    const router = useRouter();
    const animetitle = useStore(useTitle, (state) => state.animetitle);
    const Isopen = useStore(useSearchbar, (state) => state.Isopen);
    const [query, setQuery] = useState("");
    const [data, setData] = useState(null);
    const [axiosData, setAxiosData] = useState(null); // Added state for axios data
    const [loading, setLoading] = useState(false);
    const debouncedSearch = UseDebounce(query, 500);
    const [nextPage, setNextPage] = useState(false);

    let focusInput = useRef(null);

    useEffect(() => {
        const searchdata = async () => {
            setLoading(true);
            try {
                // Using AdvancedSearch
                const advancedSearchResult = await AdvancedSearch(debouncedSearch);
                setData(advancedSearchResult.media);
                setNextPage(advancedSearchResult.pageInfo.hasNextPage);

                // Using axios
                const axiosResponse = await axios.post('https://graphql.anilist.co', {
                    query: `
                        query ($search: String) {
                            Page(page: 1, perPage: 10) {
                                pageInfo {
                                    hasNextPage
                                }
                                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                                    id
                                    title {
                                        romaji
                                        english
                                        native
                                    }
                                    coverImage {
                                        large
                                    }
                                    format
                                    episodes
                                    averageScore
                                    startDate {
                                        year
                                    }
                                    status
                                }
                            }
                        }
                    `,
                    variables: {
                        search: debouncedSearch
                    }
                });
                
                const axiosResult = axiosResponse.data.data.Page;
                setAxiosData(axiosResult.media);
                
                console.log('AdvancedSearch result:', advancedSearchResult);
                console.log('Axios result:', axiosResult);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (debouncedSearch) {
            searchdata();
        }
    }, [debouncedSearch]);

    function closeModal() {
        useSearchbar.setState({ Isopen: false });
    }

    return (
        <Transition appear show={Isopen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[99999]"
                initialFocus={focusInput}
                onClose={closeModal}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/90" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-100"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl max-h-[68dvh] transform text-left transition-all">
                                <Combobox
                                    as="div"
                                    className="max-w-[600px] mx-auto rounded-lg shadow-2xl relative flex flex-col"
                                    onChange={(e) => {
                                        useSearchbar.setState({ Isopen: false });
                                        setData(null);
                                        setQuery("");
                                    }}
                                >
                                    <div className="flex justify-between py-1">
                                        <div className="flex items-center px-2 gap-2">
                                            <p className="my-1">For quick access :</p>
                                            <div className="bg-[#1a1a1f] text-white text-xs font-bold px-2 py-1 rounded-md">CTRL</div>
                                            <span>+</span>
                                            <div className="bg-[#1a1a1f] text-white text-xs font-bold px-2 py-1 rounded-md">S</div>
                                        </div>
                                        <div className="mx-1 bg-[#1a1a1f] text-xs font-bold px-2 py-1 rounded-lg flex items-center justify-center">Anime</div>
                                    </div>
                                    <div className="flex items-center text-base font-medium rounded-lg bg-[#1a1a1f]">
                                        <Combobox.Input
                                            ref={focusInput}
                                            className="p-4 text-white w-full bg-transparent border-0 outline-none"
                                            placeholder="Search Anime..."
                                            onChange={(event) => setQuery(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    useSearchbar.setState({ Isopen: false });
                                                    router.push(`/anime/catalog?search=${encodeURIComponent(event.target.value)}`);
                                                    setData(null);
                                                    setQuery("");
                                                }
                                            }}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <Combobox.Options
                                        static
                                        className="bg-[#1a1a1f] rounded-xl mt-2 max-h-[50dvh] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-primary scrollbar-thumb-rounded"
                                    >
                                        {!loading ? (
                                            <>
                                                {data?.length > 0
                                                    ? data?.map((item) => (
                                                        <Combobox.Option
                                                            key={item.id}
                                                            value={item.id}
                                                            className={({ active }) =>
                                                                `flex items-center gap-3 py-[8px] px-5 border-b border-solid border-gray-800 ${
                                                                    active ? "bg-black/20 cursor-pointer" : ""
                                                                }`
                                                            }
                                                        >
                                                            {/* ... Option content ... */}
                                                        </Combobox.Option>
                                                    ))
                                                    : (query !== '' &&
                                                        <p className="flex items-center justify-center py-4 gap-1">
                                                            No results found.
                                                        </p>
                                                    )}
                                                {data && nextPage && (
                                                    <Link href={`/anime/catalog?search=${encodeURIComponent(query)}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                useSearchbar.setState({ Isopen: false });
                                                                setQuery("");
                                                            }}
                                                            className="flex w-full items-center justify-center gap-2 py-4 transition duration-300 ease-in-out cursor-pointer border-none bg-[#4d148c] text-white text-base z-[5]"
                                                        >
                                                            View Results
                                                        </button>
                                                    </Link>
                                                )}
                                            </>
                                        ) : (
                                            <p>Loading...</p> // Add a loading indicator
                                        )}
                                    </Combobox.Options>
                                </Combobox>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default Search;
