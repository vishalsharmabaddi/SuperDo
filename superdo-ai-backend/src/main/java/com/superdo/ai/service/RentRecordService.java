package com.superdo.ai.service;

import com.superdo.ai.dto.RentRecordRequest;
import com.superdo.ai.entity.RentParty;
import com.superdo.ai.entity.RentPartyRole;
import com.superdo.ai.entity.RentRecord;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.RentRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RentRecordService {

    private static final Logger log = LoggerFactory.getLogger(RentRecordService.class);
    private static final DateTimeFormatter MONTH_KEY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final RentRecordRepository rentRecordRepository;
    private final UserService userService;
    private final RentPartyService rentPartyService;

    public RentRecordService(RentRecordRepository rentRecordRepository,
                             UserService userService,
                             RentPartyService rentPartyService) {
        this.rentRecordRepository = rentRecordRepository;
        this.userService = userService;
        this.rentPartyService = rentPartyService;
    }

    @Transactional(readOnly = true)
    public List<RentRecord> list(Long userId) {
        return rentRecordRepository.findByUserIdOrderByDueDateAsc(userId);
    }

    @Transactional
    public RentRecord create(Long userId, RentRecordRequest request) {
        RentRecord record = new RentRecord();
        record.setUser(userService.getRequiredUser(userId));
        applyRequest(userId, record, request);
        RentRecord saved = rentRecordRepository.save(record);
        log.debug("RentRecord created id={} for userId={}", saved.getId(), userId);
        return saved;
    }

    @Transactional
    public RentRecord update(Long userId, Long id, RentRecordRequest request) {
        RentRecord record = getOwned(userId, id);
        applyRequest(userId, record, request);
        RentRecord saved = rentRecordRepository.save(record);
        log.debug("RentRecord updated id={} for userId={}", id, userId);
        return saved;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        rentRecordRepository.delete(getOwned(userId, id));
        log.debug("RentRecord deleted id={} for userId={}", id, userId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private RentRecord getOwned(Long userId, Long id) {
        RentRecord record = rentRecordRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Rent record not found"));
        if (!record.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Rent record not found");
        }
        return record;
    }

    private void applyRequest(Long userId, RentRecord record, RentRecordRequest request) {
        RentParty payerParty = rentPartyService.resolveOrCreate(
                userId,
                request.getPayerPartyId(),
                request.getTenantName(),
                RentPartyRole.TENANT
        );
        RentParty receiverParty = rentPartyService.resolveOrCreate(
                userId,
                request.getReceiverPartyId(),
                request.getLandlordName(),
                RentPartyRole.LANDLORD
        );

        record.setPayerParty(payerParty);
        record.setReceiverParty(receiverParty);
        record.setTenantName(payerParty != null ? payerParty.getDisplayName() : request.getTenantName());
        record.setLandlordName(receiverParty != null ? receiverParty.getDisplayName() : request.getLandlordName());
        record.setRentAmount(request.getRentAmount());
        record.setDueDate(request.getDueDate());
        record.setPaymentStatus(request.getPaymentStatus());
        record.setNotes(request.getNotes());
        String expectedMonthKey = request.getDueDate().format(MONTH_KEY_FORMATTER);
        String providedMonthKey = request.getMonthKey() == null ? "" : request.getMonthKey().trim();
        if (providedMonthKey.isBlank()) {
            record.setMonthKey(expectedMonthKey);
        } else {
            if (!providedMonthKey.equals(expectedMonthKey)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Month key must match due date month. Expected: " + expectedMonthKey);
            }
            record.setMonthKey(providedMonthKey);
        }
    }
}
