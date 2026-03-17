import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import FloatingSupportMenu from "../components/FloatingSupportMenu";
import TripSearchBar from "../components/TripSearchBar";
import TripList from "../components/TripList";

const tripMockData = [
  {
    id: "trip-1",
    origin: "Hà Nội",
    destination: "Hưng Yên",
    distance: "60 km",
    duration: "1.5 giờ",
    price: "120.000 đ",
    driver: {
      initial: "N",
      name: "Nguyễn Văn Hùng",
      rating: "4.8",
      vehicle: "Toyota Innova",
    },
    departureTime: "06:30",
    availableSeats: 3,
    totalSeats: 6,
    pickupPoints: ["Long Biên", "Bến xe Hà Đông"],
    dropoffPoints: ["Chợ Kim Động", "Bến xe Hưng Yên"],
    note: "Xe có điều hòa, đi đúng giờ",
    date: "2026-03-15",
  },
  {
    id: "trip-2",
    origin: "Hà Nội",
    destination: "Hưng Yên",
    distance: "60 km",
    duration: "1.5 giờ",
    price: "120.000 đ",
    driver: {
      initial: "T",
      name: "Trần Thị Mai",
      rating: "4.6",
      vehicle: "Honda CR-V",
    },
    departureTime: "07:00",
    availableSeats: 1,
    totalSeats: 4,
    pickupPoints: ["Mỹ Đình", "Trung tâm Nam Từ Liêm"],
    dropoffPoints: ["UBND Huyện Ân Thi", "Bến xe Hưng Yên"],
    note: "Chuyến sáng ổn định",
    date: "2026-03-15",
  },
  {
    id: "trip-3",
    origin: "Hà Nội",
    destination: "Bắc Ninh",
    distance: "40 km",
    duration: "1 giờ",
    price: "100.000 đ",
    driver: {
      initial: "N",
      name: "Nguyễn Văn Hùng",
      rating: "4.8",
      vehicle: "Toyota Innova",
    },
    departureTime: "07:30",
    availableSeats: 5,
    totalSeats: 6,
    pickupPoints: ["Long Biên", "Gia Lâm"],
    dropoffPoints: ["Từ Sơn", "TP. Bắc Ninh"],
    note: "Chuyến buổi sáng sớm",
    date: "2026-03-16",
  },
  {
    id: "trip-4",
    origin: "Hà Nội",
    destination: "Vĩnh Phúc",
    distance: "50 km",
    duration: "1.5 giờ",
    price: "110.000 đ",
    driver: {
      initial: "P",
      name: "Phạm Thị Lan",
      rating: "4.7",
      vehicle: "Mitsubishi Xpander",
    },
    departureTime: "08:00",
    availableSeats: 6,
    totalSeats: 6,
    pickupPoints: ["Tây Hồ", "Ba Đình"],
    dropoffPoints: ["Phúc Yên", "TP. Vĩnh Yên"],
    note: "Chuyến cuối tuần",
    date: "2026-03-16",
  },
  {
    id: "trip-5",
    origin: "Hà Nội",
    destination: "Ninh Bình",
    distance: "95 km",
    duration: "2 giờ",
    price: "150.000 đ",
    driver: {
      initial: "Đ",
      name: "Đỗ Minh Quân",
      rating: "4.9",
      vehicle: "Kia Carnival",
    },
    departureTime: "09:00",
    availableSeats: 2,
    totalSeats: 7,
    pickupPoints: ["Cầu Giấy", "Thanh Xuân"],
    dropoffPoints: ["TP. Ninh Bình", "Tam Điệp"],
    note: "Xe rộng, có sạc điện thoại",
    date: "2026-03-17",
  },
  {
    id: "trip-6",
    origin: "Hà Nội",
    destination: "Hải Dương",
    distance: "58 km",
    duration: "1.4 giờ",
    price: "115.000 đ",
    driver: {
      initial: "L",
      name: "Lê Anh Dũng",
      rating: "4.7",
      vehicle: "Mazda CX-5",
    },
    departureTime: "10:00",
    availableSeats: 4,
    totalSeats: 5,
    pickupPoints: ["Hoàn Kiếm", "Hai Bà Trưng"],
    dropoffPoints: ["TP. Hải Dương", "Tứ Kỳ"],
    note: "Hỗ trợ đón linh hoạt",
    date: "2026-03-18",
  },
];

function SearchTripPage() {
  const [searchForm, setSearchForm] = useState({
    origin: "",
    destination: "",
    date: "",
  });
  const [submittedForm, setSubmittedForm] = useState({
    origin: "",
    destination: "",
    date: "",
  });

  const filteredTrips = useMemo(() => {
    return tripMockData.filter((trip) => {
      const matchesOrigin = submittedForm.origin
        ? trip.origin.toLowerCase().includes(submittedForm.origin.toLowerCase())
        : true;
      const matchesDestination = submittedForm.destination
        ? trip.destination.toLowerCase().includes(submittedForm.destination.toLowerCase())
        : true;
      const matchesDate = submittedForm.date ? trip.date === submittedForm.date : true;

      return matchesOrigin && matchesDestination && matchesDate;
    });
  }, [submittedForm]);

  const handleFormChange = (field, value) => {
    setSearchForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSubmittedForm(searchForm);
  };

  return (
    <div className="min-h-screen bg-[#f4f2f0]">
      <CustomerNavbar />

      <main className="pb-10">
        <section className="bg-gradient-to-r from-[#d91d1d] to-[#ff6a00]">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center gap-3 text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <FaSearch />
              </span>
              <div>
                <h1 className="text-3xl font-extrabold">Tìm chuyến xe</h1>
                <p className="text-sm text-orange-100">Tìm kiếm và đặt chỗ trên các chuyến xe ghép</p>
              </div>
            </div>

            <TripSearchBar form={searchForm} onChange={handleFormChange} onSubmit={handleSearch} />
          </div>
        </section>

        <section className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <TripList trips={filteredTrips} />
        </section>
      </main>

      <FloatingSupportMenu />
    </div>
  );
}

export default SearchTripPage;
