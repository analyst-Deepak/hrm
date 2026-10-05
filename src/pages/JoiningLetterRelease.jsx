import React, { useEffect, useState } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";


const JoiningLetterRelease = () => {
    const JOINING_SUBMIT_URL = import.meta.env.VITE_JOINING_SHEET_URL || "https://script.google.com/macros/s/AKfycbyZJjH0aHn6roRhEJ1hVPmmlJtAVRU74Fc07os6GYjKkb1xdo9wB5peDYRyTPefJn1bnQ/exec";
    const JOINING_LETTER_PLANNED_COL_AQ = 42;
    const JOINING_LETTER_ACTUAL_COL_AR = 43;
    const FAST_STAGE_TTL_MS = 10 * 60 * 1000;
    const JOINING_LETTER_DONE_KEY = "hrms_stage_done_joining_letter_v1";
    const INDUCTION_FAST_PENDING_KEY = "hrms_stage_pending_induction_v1";

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [formData, setFormData] = useState({
        status: "",
        attachmentUrl: ""
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Local State Replacement for Store
    const [joiningFmsData, setJoiningFmsData] = useState([]);
    const [storeLoading, setStoreLoading] = useState(true);

    const fetchData = async () => {
        setStoreLoading(true);
        setTableLoading(true);
        try {
            const cb = `&_=${Date.now()}&realtime=1&cache=false&bypassCache=true`;
            const res = await fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS${cb}`);
            const json = await res.json();

            if (json.success) {
                setJoiningFmsData(json.data);
            }
        } catch (error) {
            console.error("Joining Letter Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
            setTableLoading(false);
        }
    };

    const hardRefresh = async () => {
        setStoreLoading(true);
        setTableLoading(true);
        try {
            const cb = `&_=${Date.now()}&realtime=1&cache=false&bypassCache=true`;
            const res = await fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS${cb}`);
            const json = await res.json();

            if (json.success) {
                setJoiningFmsData(json.data);
                toast.success("Hard refresh complete!");
            } else {
                toast.error("Failed to load data");
            }
        } catch (error) {
            console.error("Joining Letter Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = hardRefresh;

    const readFastStageRows = (key) => {
        try {
            const rows = JSON.parse(localStorage.getItem(key) || "[]");
            const freshRows = Array.isArray(rows)
                ? rows.filter((row) => Date.now() - Number(row._savedAt || 0) < FAST_STAGE_TTL_MS)
                : [];
            if (freshRows.length !== rows.length) localStorage.setItem(key, JSON.stringify(freshRows));
            return freshRows;
        } catch {
            return [];
        }
    };

    const addFastStageRow = (key, row) => {
        const rows = readFastStageRows(key).filter((item) => item.indentNumber !== row.indentNumber);
        localStorage.setItem(key, JSON.stringify([{ ...row, _savedAt: Date.now() }, ...rows]));
    };

    const refreshAfterSubmit = () => {
        window.dispatchEvent(new Event("refresh-pending-counts"));
        setTimeout(refreshData, 1500);
        setTimeout(refreshData, 4000);
        setTimeout(() => window.dispatchEvent(new Event("refresh-pending-counts")), 2000);
        setTimeout(() => window.dispatchEvent(new Event("refresh-pending-counts")), 4500);
    };

    useEffect(() => {
        if (!joiningFmsData || joiningFmsData.length === 0) {
            setCandidateData([]);
            return;
        }

        const rawData = joiningFmsData;
        let headerRowIndex = rawData.findIndex(row =>
            row && row.some(cell =>
                cell && (
                    cell.toString().trim().toUpperCase() === "EMPLOYEE CODE" ||
                    cell.toString().trim().toUpperCase() === "ID" ||
                    cell.toString().trim().toLowerCase().includes("candiate name") ||
                    cell.toString().trim().toLowerCase().includes("candidate name")
                )
            )
        );
        if (headerRowIndex === -1) headerRowIndex = 5;
        const headers = rawData[headerRowIndex] || [];
        const dataRows = rawData.slice(headerRowIndex + 1);

        const getIndex = (headerName) => {
            const norm = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const idx = headers.findIndex(h => {
                if (!h) return false;
                const hNorm = h.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                return hNorm === norm || hNorm.includes(norm) || norm.includes(hNorm);
            });
            return idx;
        };

        const idxIndent = getIndex("ID") !== -1 ? getIndex("ID") : (getIndex("Indent Number") !== -1 ? getIndex("Indent Number") : 5);
        const idxName = getIndex("CANDIATE NAME") !== -1 ? getIndex("CANDIATE NAME") : (getIndex("Candidate Name") !== -1 ? getIndex("Candidate Name") : 6);
        const idxDept = getIndex("Department") !== -1 ? getIndex("Department") : 2;
        const idxDesig = getIndex("Designation") !== -1 ? getIndex("Designation") : 14;
        const idxMobile = getIndex("Mobile No") !== -1 ? getIndex("Mobile No") : (getIndex("Contact No") !== -1 ? getIndex("Contact No") : 23);
        const idxEmail = getIndex("Personal Email") !== -1 ? getIndex("Personal Email") : (getIndex("Email Id") !== -1 ? getIndex("Email Id") : 31);
        
        const hasSheetValue = (value) => {
            if (value === null || value === undefined) return false;
            const str = value.toString().trim();
            return (
                str !== "" &&
                str !== "0" &&
                str !== "0.0" &&
                str !== "00:00:00" &&
                str !== "1899-12-30" &&
                str !== "false" &&
                str !== "FALSE" &&
                str !== "#N/A" &&
                str !== "#VALUE!" &&
                str !== "#REF!" &&
                str !== "NaN"
            );
        };

        const completedByIndent = new Map(readFastStageRows(JOINING_LETTER_DONE_KEY).map((item) => [item.indentNumber, item]));

        const processedData = dataRows.map((row) => {
            if (!row || row.length === 0) return null;

            const indentNumber = row[idxIndent] || "";
            const columnAQ = row[JOINING_LETTER_PLANNED_COL_AQ];
            const columnAR = row[JOINING_LETTER_ACTUAL_COL_AR];
            const completedRow = completedByIndent.get(indentNumber);
            const effectiveColumnAR = hasSheetValue(columnAR) ? columnAR : (hasSheetValue(completedRow?.columnAR) ? completedRow?.columnAR : "");

            return {
                indentNumber,
                candidateName: row[idxName] || "",
                department: row[idxDept] || "",
                designation: row[idxDesig] || "",
                contactNo: row[idxMobile] || "",
                email: row[idxEmail] || "",
                columnAQ: columnAQ,
                columnAR: effectiveColumnAR,
                isPending: hasSheetValue(columnAQ) && !hasSheetValue(effectiveColumnAR),
                isHistory: hasSheetValue(columnAQ) && hasSheetValue(effectiveColumnAR)
            };
        }).filter(item => item !== null && (item.isPending || item.isHistory));

        setCandidateData(processedData);
    }, [joiningFmsData]);

    // fetchCandidateData replaced by useEffect reacting to global store

    const getFilteredData = () => {
        let filtered = candidateData;

        if (activeTab === "pending") {
            filtered = filtered.filter(item => item.isPending);
        } else if (activeTab === "history") {
            filtered = filtered.filter(item => item.isHistory);
        }

        if (deptFilter) {
            filtered = filtered.filter(item => item.department === deptFilter);
        }

        if (desigFilter) {
            filtered = filtered.filter(item => item.designation === desigFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((item) =>
                (item.candidateName || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.department || "").toLowerCase().includes(term)
            );
        }

        return filtered;
    };

    const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
    const designations = [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();

    const filteredData = getFilteredData();

    const handleOpenModal = (candidate) => {
        setSelectedCandidate(candidate);
        setFormData({
            status: "Yes",
            attachmentUrl: ""
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCandidate(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const secureUrl = await uploadToCloudinary(file);
            setFormData((prev) => ({
                ...prev,
                attachmentUrl: secureUrl,
            }));
            toast.success("File uploaded successfully!");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("File upload error: " + (error.message || "Failed to upload"));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Create a new Date object
            const now = new Date();
            // Format timestamp as YYYY-MM-DD HH:MM:SS
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

            // Prepare data for submission
            const dataArray = [
                selectedCandidate.indentNumber,  // Column A - Indent Number
                "J-2",                            // Column B - Step Code (hardcoded J-2)
                timestamp,                        // Column C - Timestamp (DD/MM/YY HH:MM:SS)
                formData.status,                  // Column D - Status
                formData.attachmentUrl            // Column E - Attachment URL
            ];

            // Use GET request with URL parameters for Google Apps Script
            const params = new URLSearchParams({
                action: "submit",
                sheet: "DATA RESPONSE",
                data: JSON.stringify(dataArray)
            });

            const url = `${JOINING_SUBMIT_URL}?${params.toString()}`;
            console.log("Submitting to:", url);

            const response = await fetch(url);
            const result = await response.json();
            console.log("Submit result:", result);

            if (result.success) {
                toast.success("Status submitted successfully!");
                addFastStageRow(JOINING_LETTER_DONE_KEY, { ...selectedCandidate, columnAR: timestamp });
                addFastStageRow(INDUCTION_FAST_PENDING_KEY, { ...selectedCandidate, columnAV: timestamp, columnAW: "" });
                setCandidateData((prev) =>
                    prev.map((item) =>
                        item.indentNumber === selectedCandidate.indentNumber
                            ? { ...item, columnAR: timestamp, isPending: false, isHistory: true }
                            : item
                    )
                );
                handleCloseModal();
                refreshAfterSubmit();
            } else {
                toast.error(result.error || "Failed to submit status");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Error submitting form");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800 uppercase">
                    Joining Letter Release
                </h1>
                <button
                    onClick={hardRefresh}
                    disabled={tableLoading}
                    className="p-1.5 rounded-lg bg-white border border-gray-300 shadow-sm text-gray-600 hover:text-navy hover:bg-gray-50 transition-all duration-200 disabled:opacity-60 cursor-pointer"
                    title="Hard Refresh"
                >
                    <RefreshCw size={20} className={tableLoading ? "animate-spin text-navy" : ""} />
                </button>
            </div>

            {/* Search and Tabs */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "pending" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "history" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
                            History
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-3 flex-1 justify-end">
                        <div className="relative flex-1 max-w-xs">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-40">
                                <select
                                    value={deptFilter}
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-40">
                                <select
                                    value={desigFilter}
                                    onChange={(e) => setDesigFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                                >
                                    <option value="">All Posts</option>
                                    {designations.map(desig => (
                                        <option key={desig} value={desig}>{desig}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setDeptFilter("");
                                    setDesigFilter("");
                                }}
                                className="p-2 text-gray-400 hover:text-navy transition-colors"
                                title="Clear Filters"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto table-container">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {activeTab === "pending" && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                    )}

                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Indent Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Candidate Name
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Designation
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            No candidates found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            {activeTab === "pending" && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors"
                                                    >
                                                        Update Status
                                                    </button>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">
                                                {item.indentNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.candidateName}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.designation}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.contactNo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.email}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Update Status</h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Indent Number:</strong> {selectedCandidate?.indentNumber}
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    <strong>Candidate:</strong> {selectedCandidate?.candidateName}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="Hold">Hold</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Attachment File
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy text-sm"
                                    disabled={uploading}
                                />
                                {uploading && <p className="text-xs text-navy mt-1">Uploading...</p>}
                                {formData.attachmentUrl && (
                                    <p className="text-xs text-green-600 mt-1 truncate">
                                        Uploaded: {formData.attachmentUrl}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Submitting..." : (uploading ? "Uploading..." : "Submit")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoiningLetterRelease;
